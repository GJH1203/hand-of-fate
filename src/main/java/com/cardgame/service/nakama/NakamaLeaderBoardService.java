package com.cardgame.service.nakama;

import com.cardgame.dto.nakama.ImmutableLeaderboardRecordDto;
import com.cardgame.dto.nakama.ImmutableLeaderboardResponseDto;
import com.cardgame.dto.nakama.LeaderboardRecordDto;
import com.cardgame.dto.nakama.LeaderboardResponseDto;
import com.heroiclabs.nakama.Client;
import com.heroiclabs.nakama.DefaultClient;
import com.heroiclabs.nakama.Session;
import com.heroiclabs.nakama.api.LeaderboardRecord;
import com.heroiclabs.nakama.api.LeaderboardRecordList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class NakamaLeaderBoardService {
    private static final Logger logger = LoggerFactory.getLogger(NakamaLeaderBoardService.class);

    // Leaderboard IDs - these must match what you create in Nakama
    private static final String WEEKLY_LEADERBOARD = "weekly_score";
    private static final String ALLTIME_LEADERBOARD = "all_time_score";

    @Value("${nakama.host:localhost}")
    private String host;

    @Value("${nakama.port:7349}")
    private int port;

    @Value("${nakama.serverKey:defaultkey}")
    private String serverKey;

    @Value("${nakama.ssl:false}")
    private boolean ssl;

    private Client client;
    private Session adminSession;
    private boolean initialized = false;

    @PostConstruct
    public void init() {
        try {
            // Initialize the Nakama client
            logger.info("Initializing Nakama client with host: {}, port: {}, ssl: {}", host, port, ssl);
            this.client = new DefaultClient(serverKey, host, port, ssl);

            // Create an admin session with a unique device ID
            String uniqueDeviceId = UUID.randomUUID().toString();
            logger.info("Authenticating with device ID: {}", uniqueDeviceId);
            this.adminSession = client.authenticateDevice(uniqueDeviceId).get();
            this.initialized = true;

            logger.info("Nakama client initialized successfully with device ID: {}", uniqueDeviceId);
        } catch (Exception e) {
            logger.error("Failed to initialize Nakama client: {}", e.getMessage(), e);
            this.initialized = false;
        }
    }

    /**
     * Ensures we have a valid session before performing operations
     */
    private void ensureSession() {
        if (!initialized) {
            // Reinitialize the client completely
            init();
            if (!initialized) {
                throw new RuntimeException("Failed to initialize Nakama client");
            }
        } else if (adminSession == null) {
            try {
                logger.info("Re-initializing Nakama session");
                String uniqueDeviceId = UUID.randomUUID().toString();
                this.adminSession = client.authenticateDevice(uniqueDeviceId).get();
            } catch (Exception e) {
                logger.error("Failed to re-initialize Nakama session", e);
                this.initialized = false;
                throw new RuntimeException("Failed to initialize Nakama session", e);
            }
        }
    }

    /**
     * Submit a player's lifetime score to leaderboards using player's session
     *
     * @param nakamaUserId The Nakama user ID as a string
     * @param lifetimeScore The player's lifetime score
     * @param userName The player's username
     */
    public void submitPlayerScore(String nakamaUserId, int lifetimeScore, String userName) {
        if (nakamaUserId == null || nakamaUserId.isEmpty()) {
            logger.warn("Cannot submit score for player with null or empty Nakama user ID");
            return;
        }

        ensureSession();

        try {
            // Try to authenticate existing user first, then create if needed
            Session playerSession;
            try {
                // First try to authenticate existing user
                playerSession = client.authenticateDevice(nakamaUserId, false, userName).get();
            } catch (ExecutionException e) {
                // If user doesn't exist, create new one with unique username
                String uniqueUsername = userName + "_" + nakamaUserId.substring(0, 8);
                logger.info("User doesn't exist, creating new Nakama user: {}", uniqueUsername);
                playerSession = client.authenticateDevice(nakamaUserId, true, uniqueUsername).get();
            }
            
            // Submit to weekly leaderboard using player's session
            client.writeLeaderboardRecord(playerSession, WEEKLY_LEADERBOARD, lifetimeScore).get();
            // Submit to all-time leaderboard using player's session
            client.writeLeaderboardRecord(playerSession, ALLTIME_LEADERBOARD, lifetimeScore).get();

            logger.info("Successfully submitted lifetime score {} for user '{}' (ID: {})", lifetimeScore, userName, nakamaUserId);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error writing leaderboard record for user '{}' (ID: {}): {}", userName, nakamaUserId, e.getMessage(), e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * Submit a player's lifetime score to leaderboards (legacy method with authentication)
     *
     * @param nakamaUserId The Nakama user ID as a string
     * @param lifetimeScore The player's lifetime score
     * @param userName The player's username  
     * @param email The player's email
     * @param password The player's password
     */
    public void submitPlayerScore(String nakamaUserId, int lifetimeScore, String userName, String email, String password) {
        // Delegate to the new simpler method that doesn't require authentication
        submitPlayerScore(nakamaUserId, lifetimeScore, userName);
    }


    // Utility method to convert UUID to long in a consistent way
    private long convertUuidToLong(String uuid) {
        // Remove hyphens
        String cleanUuid = uuid.replace("-", "");

        // Take first 16 characters (to fit in a long)
        // This is not perfect but provides a reasonable distribution
        String truncatedHex = cleanUuid.substring(0, Math.min(16, cleanUuid.length()));

        try {
            // Parse as unsigned hex to get a long
            return Long.parseUnsignedLong(truncatedHex, 16);
        } catch (NumberFormatException e) {
            // Fallback to hashCode if parsing fails
            return Math.abs((long)uuid.hashCode());
        }
    }

    /**
     * Get leaderboard records for the specified leaderboard
     *
     * @param leaderboardId The ID of the leaderboard to query
     * @param limit The maximum number of records to return
     * @return A DTO containing the leaderboard records
     */
    public LeaderboardResponseDto getLeaderboardRecords(String leaderboardId, int limit)
            throws ExecutionException, InterruptedException {

        List<String> ownerIds = null;  // Can be null if not filtering by owner
        int expiry = 0;                // 0 for no expiration filtering
        String cursor = null;          // null for first page

        LeaderboardRecordList recordList = client.listLeaderboardRecords(
                adminSession,
                leaderboardId,
                ownerIds,     // List<String> or null
                expiry,       // int
                limit,        // int
                cursor        // String or null
        ).get();

        return convertToDto(recordList);
    }

    public LeaderboardResponseDto getLeaderboardRecordsAroundPlayer(
            String leaderboardId, String nakamaUserId, int limit)
            throws ExecutionException, InterruptedException {

//        long ownerId = convertUuidToLong(nakamaUserId);

        LeaderboardRecordList recordList = client.listLeaderboardRecordsAroundOwner(
                adminSession,
                leaderboardId,
//                ownerId
                nakamaUserId,
                limit
        ).get();

        return convertToDto(recordList);
    }

    private LeaderboardResponseDto convertToDto(LeaderboardRecordList recordList) {
        List<LeaderboardRecordDto> recordDtos = recordList.getRecordsList().stream()
                .map(record -> ImmutableLeaderboardRecordDto.builder()
                        .playerId(String.valueOf(record.getOwnerId())) // Convert long back to string
                        .username(record.getUsername().getValue())
                        .score(record.getScore())
                        .rank((int) record.getRank())
                        .build())
                .collect(Collectors.toList());

        return ImmutableLeaderboardResponseDto.builder()
                .records(recordDtos)
                .nextCursor(recordList.getNextCursor())
                .prevCursor(recordList.getPrevCursor())
                .build();
    }
}
