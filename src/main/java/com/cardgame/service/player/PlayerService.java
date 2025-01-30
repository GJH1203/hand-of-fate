package com.cardgame.service.player;

import com.cardgame.dto.*;
import com.cardgame.exception.player.PlayerNotFoundException;
import com.cardgame.model.Card;
import com.cardgame.model.Player;
import com.cardgame.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlayerService {
    private final PlayerActionService playerActionService;
    private final PlayerRepository playerRepository;

    public PlayerService(PlayerActionService playerActionService, PlayerRepository playerRepository) {
        this.playerActionService = playerActionService;
        this.playerRepository = playerRepository;
    }

    public Player getPlayer(String playerId) {
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new PlayerNotFoundException("Player not found: " + playerId));
    }

    public Player createPlayer(String name) {
        Player player = new Player();
        player.setName(name);
        player.setScore(0);
        player.setHand(new ArrayList<>());
        player.setPlacedCards(new HashMap<>());

        return playerRepository.save(player);
    }

    public PlayerDto getPlayerDto(String playerId) {
        Player player = getPlayer(playerId);
        return ImmutablePlayerDto.builder()
                .id(player.getId())
                .name(player.getName())
                .score(player.getScore())
                .handSize(player.getHand().size())  // Add this
                .playerCardCounts(calculatePlayerCardCounts(player)) // Add this
                .build();
    }

    // Add this helper method
    private Map<String, Integer> calculatePlayerCardCounts(Player player) {
        // For now, return an empty map since we're just starting
        return Map.of();

        // Later you can implement actual card counting logic:
    /*
    Map<String, Integer> cardCounts = new HashMap<>();
    for (Card card : player.getPlacedCards().values()) {
        cardCounts.merge(card.getType(), 1, Integer::sum);
    }
    return cardCounts;
    */
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

        // Save the updated player to the repository if needed
        // playerRepository.save(updatedPlayer);
    }

    public void savePlayer(Player player) {
        playerRepository.save(player);
    }
}
