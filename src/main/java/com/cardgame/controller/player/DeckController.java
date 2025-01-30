package com.cardgame.controller.player;

import java.util.HashMap;
import java.util.Map;
import com.cardgame.dto.DeckDto;
import com.cardgame.exception.player.InvalidDeckException;
import com.cardgame.model.Card;
import com.cardgame.model.Deck;
import com.cardgame.model.Player;
import com.cardgame.repository.CardRepository;
import com.cardgame.service.player.DeckService;
import com.cardgame.service.player.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/decks")
public class DeckController {

    private final PlayerService playerService;
    private final DeckService deckService;

    private final CardRepository cardRepository;

    public DeckController(PlayerService playerService, DeckService deckService, CardRepository cardRepository) {
        this.playerService = playerService;
        this.deckService = deckService;
        this.cardRepository = cardRepository;
    }

    @PostMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<DeckDto> addCardToDeck(
            @PathVariable String deckId,
            @PathVariable String cardId,
            @RequestParam String playerId) {
        // Verify the player owns this deck
        Player player = playerService.getPlayer(playerId);
        if (!player.getCurrentDeck().getId().equals(deckId)) {
            throw new InvalidDeckException("This deck doesn't belong to the player");
        }

        // Get the card to add
        Card cardToAdd = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found: " + cardId));

        // Add card to deck
        Deck updatedDeck = deckService.addCardToDeck(deckId, playerId, cardToAdd);

        // Update player's current deck reference
        player.setCurrentDeck(updatedDeck);
        playerService.savePlayer(player);

        return ResponseEntity.ok(deckService.convertToDto(updatedDeck));
    }

    @DeleteMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<DeckDto> removeCardFromDeck(
            @PathVariable String deckId,
            @PathVariable String cardId,
            @RequestParam String playerId) {
        // Verify the player owns this deck
        Player player = playerService.getPlayer(playerId);
        if (!player.getCurrentDeck().getId().equals(deckId)) {
            throw new InvalidDeckException("This deck doesn't belong to the player");
        }

        // Remove card from deck
        Deck updatedDeck = deckService.removeCardFromDeck(deckId, playerId, cardId);

        // Update player's current deck reference
        player.setCurrentDeck(updatedDeck);
        playerService.savePlayer(player);

        return ResponseEntity.ok(deckService.convertToDto(updatedDeck));
    }

    @GetMapping("/{deckId}")
    public ResponseEntity<DeckDto> getDeck(
            @PathVariable String deckId,
            @RequestParam String playerId) {
        // Verify the player owns this deck
        Player player = playerService.getPlayer(playerId);
        if (!player.getCurrentDeck().getId().equals(deckId)) {
            throw new InvalidDeckException("This deck doesn't belong to the player");
        }

        Deck deck = deckService.getDeck(deckId);
        return ResponseEntity.ok(deckService.convertToDto(deck));
    }

    @GetMapping("/{deckId}/validate")
    public ResponseEntity<Map<String, Object>> validateDeck(
            @PathVariable String deckId,
            @RequestParam String playerId) {
        // Verify the player owns this deck
        Player player = playerService.getPlayer(playerId);
        if (!player.getCurrentDeck().getId().equals(deckId)) {
            throw new InvalidDeckException("This deck doesn't belong to the player");
        }

        Deck deck = deckService.getDeck(deckId);
        boolean isValid = deck.getCards().size() == 15;

        Map<String, Object> response = new HashMap<>();
        response.put("deckId", deckId);
        response.put("isValid", isValid);
        response.put("currentSize", deck.getCards().size());

        return ResponseEntity.ok(response);
    }
}
