package com.cardgame.service.player;

import com.cardgame.dto.*;
import com.cardgame.exception.player.PlayerNotFoundException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.Player;
import com.cardgame.repository.CardRepository;
import com.cardgame.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PlayerService {
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
        System.out.println("player id =========== " + player.getId());

        // Set the deck reference and save player again
        player.setCurrentDeck(defaultDeck);

        return playerRepository.save(player);
    }

    private List<Card> createDefaultDeck() {
        List<Card> defaultCards = new ArrayList<>();
        // Get the default card with id "1" from the database
        Card defaultCard = cardRepository.findById("1")
                .orElseThrow(() -> new RuntimeException("Default card with ID 1 not found"));

        // Add the same card reference 15 times
        for (int i = 0; i < 15; i++) {
            defaultCards.add(defaultCard);
        }
        return defaultCards;
    }

    public PlayerDto getPlayerDto(String playerId) {
        Player player = getPlayer(playerId);

        // Convert the Deck to DeckDto
        DeckDto deckDto = null;
        if (player.getCurrentDeck() != null) {
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
}
