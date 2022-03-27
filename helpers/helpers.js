export const validateTrial = (currentTrial, eventTrial) => {
  if (currentTrial > eventTrial) {
    eventTrial = currentTrial
    return // skip and read next row
  } else if ( trial < eventTrial) {
    return // skip and read next row
  }
}

export const validateParticipant = (currentParticipant, eventParticipant) => {

}

/**
 *Example of Bart Event
{
  '': '745',
  X: '5778',
  'Unnamed..0': '5986',
  Participant: '100',
  Run: '8',
  Trial: '20',
  BalloonCount: '115',
  PopPoint: '29',
  NewBalloon: '0',
  Winner: '0',
  PressPump: '0',
  ReleasePump: '0',
  Tokens: '25',
  CashIn: '1',
  Pop: '0',
  Onset: '378.541857004',
  Dur: '0'
}
 */

// 1) validate Trial and validate participant
// 2) record when a button is pressed
// 3) if a button is pressed, wait for release OR pop
