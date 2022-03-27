import * as fs from 'fs';
import csv from 'csv-parser';
// import { validateTrial, validateParticipant } from './helpers/helpers';

const buttonStata = {
  press: 'press',
  release: 'release',
};

let buttonStatus = buttonStata.release;
let pressOnset = 0;
let previousTrial = 0;
let previousParticipant = 0;

fs.createReadStream('./bart_data/test_v_filtered.csv')
  .pipe(csv())
  .on('data', function (bartEvent) {
    const {
      X,
      Participant,
      Run,
      Trial,
      NewBalloon,
      Winner,
      PressPump,
      ReleasePump,
      Tokens,
      CashIn,
      Pop,
      Onset
     } = bartEvent;

    //  console.log(bartEvent)
    //don't start iteration on row 0, or on first row
    // bartEvent[""] is the event number
    const eventNumber = Number(X);
    if (eventNumber < 1) return

    // make sure we're on the same participant and trial

    // validate the trial hasn't changed
    if (previousTrial < Number(Trial)) {
      // console.log("trial mismatch! trial: ", Trial, "previous trial: ", previousTrial)
      previousTrial = Number(Trial);
      return;
    }

    // validate participant hasn't changed
    if (previousParticipant !== Participant) {
      // console.log("Participant mismatch! Participant: ", Participant, "previous Participant: ", previousParticipant)
      previousParticipant = Participant;
      return;
    }

    if (buttonStatus === buttonStata.release) {
      if (PressPump === "1") { // if this row recorded a button press!
        buttonStatus = buttonStata.press;
        pressOnset = Onset;
      }
    } else {
      if ( ReleasePump === "1") { // if this row recorded a release!
        console.log("Release recorded!")
        buttonStatus = buttonStata.release;
        const duration = Onset - pressOnset
        console.log(duration);
      }
    }
  })
  .on('end', () => {});
