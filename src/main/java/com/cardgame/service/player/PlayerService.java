package com.cardgame.service.player;

import com.cardgame.dto.*;
import com.cardgame.exception.player.PlayerNotFoundException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.Player;
import com.cardgame.repository.PlayerRepository;
import com.cardgame.service.DeckInitializationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PlayerService {
    private static final Logger logger = LoggerFactory.getLogger(PlayerService.class);
    
    private final PlayerActionService playerActionService;
    private final PlayerRepository playerRepository;
    private final DeckInitializationService deckInitializationService;

    public PlayerService(PlayerActionService playerActionService, 
                        PlayerRepository playerRepository, 
                        DeckInitializationService deckInitializationService) {
        this.playerActionService = playerActionService;
        this.playerRepository = playerRepository;
        this.deckInitializationService = deckInitializationService;
    }

    public Player getPlayer(String playerId) {
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new PlayerNotFoundException("Player not found: " + playerId));
    }

    /**
     * @deprecated Use createPlayer(String, String, String, String) instead
     */
    @Deprecated
    public Player createPlayer(String name) {
        // This method should not be used anymore
        throw new UnsupportedOperationException("This method is deprecated. Use createPlayer with all required fields instead.");
    }


    public PlayerDto getPlayerDto(String playerId) {
        Player player = getPlayer(playerId);

        // Convert the Deck to DeckDto
        DeckDto deckDto = null;
        if (player.getCurrentDeck() != null && player.getCurrentDeck().getId() != null) {
            deckDto = ImmutableDeckDto.builder()
                    .id(player.getCurrentDeck().getId())
                    .ownerId(player.getCurrentDeck().getOwnerId())
                    .remainingCards(player.getCurrentDeck().getRemainingCards())
                    .cards(player.getCurrentDeck().getCards())
                    .isValid(player.getCurrentDeck().isValid())
                    .build();
        }

        return ImmutablePlayerDto.builder()
                .id(player.getId())
                .name(player.getName())
                .score(player.getScore())
                .lifetimeScore(player.getLifetimeScore()) // Include lifetime score in DTO
                .handSize(player.getHand().size())
                .currentDeck(deckDto)
                .playerCardCounts(calculatePlayerCardCounts(player))
                .build();
    }

    // Add this helper method
    private Map<String, Integer> calculatePlayerCardCounts(Player player) {
        // For now, return an empty map since we're just starting
        return Map.of();
    }

    public void addCardToHand(PlayerDto player, CardDto card) {
        List<CardDto> currentHand = player.getHand();
        currentHand.add(card);
        ImmutablePlayerDto.builder()
                .from(player)
                .hand(currentHand);
    }

    public void removeCardFromHand(PlayerDto player, CardDto card) {
        List<CardDto> currentHand = player.getHand();
        currentHand.remove(card);
        ImmutablePlayerDto.builder()
                .from(player)
                .hand(currentHand);
    }

    public void placeCard(PlayerDto player, CardDto card, PositionDto position) {
        // Create a card placement action
        PlayerAction action = playerActionService.placeCard(player.getId(), card, position);

        // Update the player's placed cards
        Map<PositionDto, CardDto> currentPlacedCards = new HashMap<>(player.getPlacedCards());
        currentPlacedCards.put(position, card);

        // Build the updated PlayerDto
        ImmutablePlayerDto.builder()
                .from(player)
                .placedCards(currentPlacedCards);
    }

    public void savePlayer(Player player) {
        playerRepository.save(player);
    }

    // Add this method to find a player by Nakama user ID
    public Optional<Player> findPlayerByNakamaUserId(String nakamaUserId) {
        return playerRepository.findByNakamaUserId(nakamaUserId);
    }

    /**
     * @deprecated Use createPlayer(String, String, String, String) instead
     */
    @Deprecated
    public Player createPlayer(String name, String email, String nakamaUserId) {
        // Redirect to the unified method with null supabaseUserId
        return createPlayer(name, email, null, nakamaUserId);
    }
    

    // Add methods to update lifetime score
    public void addToLifetimeScore(String playerId, int points) {
        Player player = getPlayer(playerId);
        player.setLifetimeScore(player.getLifetimeScore() + points);
        savePlayer(player);
    }

    public void setLifetimeScore(String playerId, int lifetimeScore) {
        Player player = getPlayer(playerId);
        player.setLifetimeScore(lifetimeScore);
        savePlayer(player);
    }
    
    public Player findPlayerByName(String name) {
        return playerRepository.findByName(name).orElse(null);
    }
    
    public Optional<Player> findPlayerByEmail(String email) {
        return playerRepository.findByEmail(email);
    }
    
    public Optional<Player> findPlayerBySupabaseUserId(String supabaseUserId) {
        try {
            return playerRepository.findBySupabaseUserId(supabaseUserId);
        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException e) {
            // Handle case where there are multiple players with same Supabase ID
            logger.warn("Multiple players found with Supabase ID: {}, returning the first one", supabaseUserId);
            List<Player> players = playerRepository.findAllBySupabaseUserId(supabaseUserId);
            if (!players.isEmpty()) {
                // Return the first player and log the issue
                logger.info("Found {} players with same Supabase ID, using player: {}", players.size(), players.get(0).getId());
                return Optional.of(players.get(0));
            }
            return Optional.empty();
        }
    }
    
    /**
     * Unified player creation method that handles all authentication providers
     * @param name Username (must be unique)
     * @param email Email address (must be unique)
     * @param supabaseUserId Supabase user ID (can be null for legacy systems)
     * @param nakamaUserId Nakama user ID (can be null, will be set later)
     * @return Created or existing player
     */
    public Player createPlayer(String name, String email, String supabaseUserId, String nakamaUserId) {
        // Validate required fields
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Player name cannot be null or empty");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
        
        // Validate email format
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        if (!email.matches(emailRegex)) {
            throw new IllegalArgumentException("Invalid email format: " + email);
        }
        
        try {
            // Check for existing player by various IDs (in order of preference)
            
            // 1. Check by Supabase ID (most reliable for new system)
            if (supabaseUserId != null && !supabaseUserId.trim().isEmpty()) {
                Optional<Player> existingBySupabaseId = playerRepository.findBySupabaseUserId(supabaseUserId);
                if (existingBySupabaseId.isPresent()) {
                    Player existing = existingBySupabaseId.get();
                    // Update Nakama ID if provided and not already set
                    if (nakamaUserId != null && existing.getNakamaUserId() == null) {
                        existing.setNakamaUserId(nakamaUserId);
                        return playerRepository.save(existing);
                    }
                    return existing;
                }
            }
            
            // 2. Check by email (to prevent duplicates)
            Optional<Player> existingByEmail = playerRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                Player existing = existingByEmail.get();
                // Update IDs if not set
                boolean updated = false;
                if (supabaseUserId != null && existing.getSupabaseUserId() == null) {
                    existing.setSupabaseUserId(supabaseUserId);
                    updated = true;
                }
                if (nakamaUserId != null && existing.getNakamaUserId() == null) {
                    existing.setNakamaUserId(nakamaUserId);
                    updated = true;
                }
                return updated ? playerRepository.save(existing) : existing;
            }
            
            // 3. Check by username
            Optional<Player> existingByName = playerRepository.findByName(name);
            if (existingByName.isPresent()) {
                throw new IllegalArgumentException("Username already exists: " + name);
            }
            
            // 4. Check by Nakama ID if provided
            if (nakamaUserId != null && !nakamaUserId.trim().isEmpty()) {
                Optional<Player> existingByNakamaId = playerRepository.findByNakamaUserId(nakamaUserId);
                if (existingByNakamaId.isPresent()) {
                    throw new IllegalArgumentException("Nakama user already exists: " + nakamaUserId);
                }
            }

            // Create new player
            Player player = new Player();
            player.setName(name);
            player.setEmail(email);
            player.setSupabaseUserId(supabaseUserId);
            player.setNakamaUserId(nakamaUserId);
            player.setScore(0);
            player.setLifetimeScore(0);
            player.setHand(new ArrayList<>());
            player.setPlacedCards(new HashMap<>());

            // Save player first to get the ID
            player = playerRepository.save(player);
            logger.info("Created new player: {} (ID: {})", player.getName(), player.getId());

            // Create a default deck for the player using the deck initialization service
            Deck defaultDeck = deckInitializationService.createDefaultDeckForPlayer(player.getId());
            logger.info("Created default deck for player: {}", player.getId());

            // Set the deck reference and save player again
            player.setCurrentDeck(defaultDeck);
            return playerRepository.save(player);
            
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // Handle MongoDB duplicate key error - likely a race condition
            logger.warn("Duplicate key error during player creation, attempting to find existing player: {}", e.getMessage());
            
            // Use the same logic as in the main flow for consistency
            
            // 1. Check by Supabase ID
            if (supabaseUserId != null && !supabaseUserId.trim().isEmpty()) {
                Optional<Player> existingBySupabaseId = playerRepository.findBySupabaseUserId(supabaseUserId);
                if (existingBySupabaseId.isPresent()) {
                    Player existing = existingBySupabaseId.get();
                    // Update Nakama ID if provided and not already set
                    if (nakamaUserId != null && existing.getNakamaUserId() == null) {
                        existing.setNakamaUserId(nakamaUserId);
                        return playerRepository.save(existing);
                    }
                    return existing;
                }
            }
            
            // 2. Check by email and update IDs if needed
            Optional<Player> existingByEmail = playerRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                Player existing = existingByEmail.get();
                boolean updated = false;
                if (supabaseUserId != null && existing.getSupabaseUserId() == null) {
                    existing.setSupabaseUserId(supabaseUserId);
                    updated = true;
                }
                if (nakamaUserId != null && existing.getNakamaUserId() == null) {
                    existing.setNakamaUserId(nakamaUserId);
                    updated = true;
                }
                return updated ? playerRepository.save(existing) : existing;
            }
            
            // If we can't find the conflicting record, re-throw the original exception
            throw new IllegalArgumentException("Player creation failed due to a duplicate key error: " + e.getMessage());
        }
    }
    
    /**
     * Convenience method for creating players from Supabase (maintains backward compatibility)
     */
    public Player createPlayerFromSupabase(String name, String email, String supabaseUserId) {
        return createPlayer(name, email, supabaseUserId, null);
    }
    
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }
    
    public void deletePlayer(String playerId) {
        playerRepository.deleteById(playerId);
    }
    
    public void deleteAllPlayers() {
        playerRepository.deleteAll();
    }
    
    public void createDefaultDeckForPlayer(String playerId) {
        Player player = getPlayer(playerId);
        if (player.getCurrentDeck() == null) {
            Deck defaultDeck = deckInitializationService.createDefaultDeckForPlayer(playerId);
            player.setCurrentDeck(defaultDeck);
            playerRepository.save(player);
        }
    }
}
