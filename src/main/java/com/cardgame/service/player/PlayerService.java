package com.cardgame.service.player;

import com.cardgame.dto.*;
import com.cardgame.exception.player.PlayerNotFoundException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.Player;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PlayerService {
    private static final Logger logger = LoggerFactory.getLogger(PlayerService.class);
    
    private final PlayerActionService playerActionService;
    private final PlayerRepository playerRepository;
    private final DeckService deckService;
    private final CardRepository cardRepository;

    public PlayerService(PlayerActionService playerActionService, PlayerRepository playerRepository, DeckService deckService, CardRepository cardRepository) {
        this.playerActionService = playerActionService;
        this.playerRepository = playerRepository;
        this.deckService = deckService;
        this.cardRepository = cardRepository;
    }

    public Player getPlayer(String playerId) {
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new PlayerNotFoundException("Player not found: " + playerId));
    }

    public Player createPlayer(String name) {
        // Create player with basic initialization
        Player player = new Player();
        player.setName(name);
        player.setScore(0);
        player.setLifetimeScore(0); // Initialize lifetime score to 0
        player.setHand(new ArrayList<>());
        player.setPlacedCards(new HashMap<>());

        // Save player first to get the ID
        player = playerRepository.save(player);

        // Create a default deck for the player
        List<Card> defaultCards = createDefaultDeck();
        Deck defaultDeck = deckService.createDeck(player.getId(), defaultCards);
        logger.debug("Created player with ID: {}", player.getId());

        // Set the deck reference and save player again
        player.setCurrentDeck(defaultDeck);

        return playerRepository.save(player);
    }

    private List<Card> createDefaultDeck() {
        List<Card> defaultCards = new ArrayList<>();
        // Get the default card with id "1" from the database
        Card defaultCard = cardRepository.findById("1")
                .orElseThrow(() -> new RuntimeException("Default card with ID 1 not found"));

        // Create unique card instances with different IDs
        for (int i = 0; i < 15; i++) {
            Card uniqueCard = new Card();
            uniqueCard.setId("default_" + UUID.randomUUID().toString());
            uniqueCard.setPower(defaultCard.getPower());
            uniqueCard.setName(defaultCard.getName() + " #" + (i + 1));
            defaultCards.add(uniqueCard);
        }
        return defaultCards;
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

    // Update create player to take email and nakamaUserId
    public Player createPlayer(String name, String email, String nakamaUserId) {
        // Validate input parameters
        validatePlayerCreationInput(name, email, nakamaUserId);
        
        // Check for duplicate username
        if (playerRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Username already exists: " + name);
        }
        
        // Check for duplicate email
        if (playerRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }
        
        // Check for duplicate Nakama user ID
        if (playerRepository.findByNakamaUserId(nakamaUserId).isPresent()) {
            throw new IllegalArgumentException("Nakama user already exists: " + nakamaUserId);
        }

        // Create player with basic initialization
        Player player = new Player();
        player.setName(name);
        player.setScore(0);
        player.setLifetimeScore(0); // Initialize lifetime score to 0
        player.setHand(new ArrayList<>());
        player.setPlacedCards(new HashMap<>());
        player.setEmail(email);
        player.setNakamaUserId(nakamaUserId);

        // Save player first to get the ID
        player = playerRepository.save(player);

        // Create a default deck for the player
        List<Card> defaultCards = createDefaultDeck();
        Deck defaultDeck = deckService.createDeck(player.getId(), defaultCards);

        // Set the deck reference and save player again
        player.setCurrentDeck(defaultDeck);

        return playerRepository.save(player);
    }
    
    private void validatePlayerCreationInput(String name, String email, String nakamaUserId) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Player name cannot be null or empty");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
        if (nakamaUserId == null || nakamaUserId.trim().isEmpty()) {
            throw new IllegalArgumentException("Nakama user ID cannot be null or empty");
        }
        
        // Basic email format validation using regex
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        if (!email.matches(emailRegex)) {
            throw new IllegalArgumentException("Invalid email format: " + email);
        }
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
    
    public Player createPlayerFromSupabase(String name, String email, String supabaseUserId) {
        // Validate input parameters
        validatePlayerCreationInput(name, email, supabaseUserId);
        
        try {
            // Use MongoDB's upsert-like behavior to prevent duplicates
            // First check for existing user by Supabase ID - most reliable identifier
            Optional<Player> existingBySupabaseId = playerRepository.findBySupabaseUserId(supabaseUserId);
            if (existingBySupabaseId.isPresent()) {
                return existingBySupabaseId.get();
            }
            
            // Check for duplicate email
            Optional<Player> existingByEmail = playerRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                throw new IllegalArgumentException("Email already exists: " + email);
            }
            
            // Check for duplicate username
            Optional<Player> existingByName = playerRepository.findByName(name);
            if (existingByName.isPresent()) {
                throw new IllegalArgumentException("Username already exists: " + name);
            }

            // Create player with basic initialization
            Player player = new Player();
            player.setName(name);
            player.setScore(0);
            player.setLifetimeScore(0);
            player.setHand(new ArrayList<>());
            player.setPlacedCards(new HashMap<>());
            player.setEmail(email);
            player.setSupabaseUserId(supabaseUserId);

            // Save player first to get the ID - this may throw DuplicateKeyException
            player = playerRepository.save(player);

            // Create a default deck for the player
            List<Card> defaultCards = createDefaultDeck();
            Deck defaultDeck = deckService.createDeck(player.getId(), defaultCards);

            // Set the deck reference and save player again
            player.setCurrentDeck(defaultDeck);

            return playerRepository.save(player);
            
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // Handle MongoDB duplicate key error - likely a race condition
            logger.warn("Duplicate key error during player creation, attempting to find existing player: {}", e.getMessage());
            
            // Try to find the existing player by any of the unique fields
            Optional<Player> existing = playerRepository.findBySupabaseUserId(supabaseUserId);
            if (existing.isPresent()) {
                return existing.get();
            }
            
            existing = playerRepository.findByEmail(email);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("Email already exists: " + email);
            }
            
            existing = playerRepository.findByName(name);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("Username already exists: " + name);
            }
            
            // If we can't find the conflicting record, re-throw the original exception
            throw new IllegalArgumentException("Player creation failed due to duplicate key: " + e.getMessage());
        }
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
            List<Card> defaultCards = createDefaultDeck();
            Deck defaultDeck = deckService.createDeck(playerId, defaultCards);
            player.setCurrentDeck(defaultDeck);
            playerRepository.save(player);
        }
    }
}
