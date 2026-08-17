/**
 * Turns the server's reason for refusing a join into a sentence for the player.
 *
 * `NakamaMatchService.joinMatch` refuses for three distinct reasons and says which
 * — the code is unknown, the match is already under way, or it is your own room —
 * and the frontend used to throw all of that away and report "Failed to join
 * match". Somebody trying to join their own room got no hint that that was the
 * problem, which is exactly the case a person is most likely to hit while testing.
 */
const NO_SUCH_BATTLE = 'No battle found with this code.'

export function humanizeJoinError(raw?: string | null): string {
  const text = (raw ?? '').toLowerCase()

  if (text.includes('your own match')) {
    return 'You cannot join your own battle — share the code with someone else.'
  }
  if (text.includes('already started') || text.includes('completed')) {
    return 'That battle has already begun.'
  }
  return NO_SUCH_BATTLE
}

export { NO_SUCH_BATTLE }
