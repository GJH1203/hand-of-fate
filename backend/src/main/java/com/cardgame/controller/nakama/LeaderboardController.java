package com.cardgame.controller.nakama;

import com.cardgame.dto.nakama.LeaderboardResponseDto;
import com.cardgame.service.nakama.NakamaAuthService;
import com.cardgame.service.nakama.NakamaLeaderBoardService;
import com.heroiclabs.nakama.Client;
import com.heroiclabs.nakama.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/leaderboards")
public class LeaderboardController {

    private static final Logger logger = LoggerFactory.getLogger(LeaderboardController.class);

    @Autowired
    private NakamaLeaderBoardService nakamaService;
    @Autowired
    private NakamaAuthService nakamaAuthService;
    @Autowired
    private Client client;

    /**
     * Get weekly leaderboard rankings
     *
     * @param limit The maximum number of records to return
     * @return Weekly leaderboard rankings
     */
    @GetMapping("/weekly")
    public ResponseEntity<LeaderboardResponseDto> getWeeklyLeaderboard(
            @RequestParam(defaultValue = "20") int limit) {
        try {
            LeaderboardResponseDto response = nakamaService.getLeaderboardRecords("weekly_score", limit);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error retrieving weekly leaderboard", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all-time leaderboard rankings
     *
     * @param limit The maximum number of records to return
     * @return All-time leaderboard rankings
     */
    @GetMapping("/all-time")
    public ResponseEntity<LeaderboardResponseDto> getAllTimeLeaderboard(
            @RequestParam(defaultValue = "20") int limit) {
        try {
            LeaderboardResponseDto response = nakamaService.getLeaderboardRecords("all_time_score", limit);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error retrieving all-time leaderboard", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get rankings around a specific player
     *
     * @param nakamaUserId The Nakama User ID
     * @param limit The number of records above and below the user to include
     * @return Leaderboard rankings around the specified player
     */
    @GetMapping("/around-player/{nakamaUserId}")
    public ResponseEntity<LeaderboardResponseDto> getLeaderboardAroundPlayer(
            @PathVariable String nakamaUserId,
            @RequestParam(defaultValue = "weekly_score") String leaderboardId,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            LeaderboardResponseDto response = nakamaService.getLeaderboardRecordsAroundPlayer(
                    leaderboardId, nakamaUserId, limit);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error retrieving leaderboard around player", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/submit-score")
    public ResponseEntity<String> submitScore(
            @RequestParam String nakamaUserId,
            @RequestParam int score,
            @RequestParam String userName,
            @RequestParam String email,
            @RequestParam String password) {
        try {
            nakamaService.submitPlayerScore(nakamaUserId, score, userName, email, password);
            return ResponseEntity.ok("Score submitted successfully");
        } catch (Exception e) {
            logger.error("Error submitting score", e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

//    @GetMapping("/test-create")
//    public ResponseEntity<String> testCreateLeaderboard() {
//        try {
//            // Use the existing service method
//            nakamaService.submitPlayerScore("05c5b907-0d72-48ee-a8c4-a0777dd02836", 10);
//            return ResponseEntity.ok("Test score submitted. Check Nakama console for created leaderboard.");
//        } catch (Exception e) {
//            logger.error("Failed to create test leaderboard", e);
//            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
//        }
//    }

}
