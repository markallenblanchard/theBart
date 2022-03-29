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
let previousPop = 0;
let previousCashIn = 0;
previousCashIn = 1

const defaultState = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  pressCount: 0,
  releaseOnset: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  previousTokens: 0,
  reactionTime: -1,
}

let state = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  pressCount: 0,
  releaseOnset: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  previousTokens: 0,
  reactionTime: -1,
}

const summaryRows = [ "participant, trial, cashIn, pop, totalTokens,  pressCount, tokensGained, duration, reactionTime" ]

fs.createReadStream('./bart_data/test_v_filtered.csv')
  .pipe(csv())
  .on('data',  (bartEvent) => {
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

    //don't start iteration on row 0, or on first row
    // bartEvent[""] is the event number
    const eventNumber = Number(X);
    if (eventNumber < 1) return

    // check if cash-in or pop
    if ( CashIn ) state.cashIn = CashIn
    if ( Pop ) state.pop = Pop

    // validate Trial and Participant helper function
    if (state.previousTrial === Number(Trial) && state.previousPop || state.previousCashIn) {
      return;
    } else {
      state = defaultState;
      state.previousParticipant = Participant
      state.previousTrial = Number(Trial)
      state.pop = Pop
      state.cashIn = CashIn
    }

    if (state.previousParticipant !== Participant) {
      state = { ...defaultState };
      state.previousParticipant = Participant
      state.previousTrial = Number(Trial)
      state.pop = Pop
      state.cashIn = CashIn
      return;
    }

    if (state.buttonStatus === buttonStata.release) {
      if (PressPump === "1") { // if this row recorded a button press!
        state.buttonStatus = buttonStata.press;
        state.pressOnset = Onset;
        state.previousTokens = Tokens;
        state.pressCount += 1
        if (state.releaseOnset) {
          state.reactionTime = state.pressOnset - Onset;
        }
      }
    } else if ( ReleasePump === "1") { // if this row recorded a release!
      state.buttonStatus = buttonStata.release;
      state.releaseOnset = Onset

      //generate summary row
      const cashInOrPop = state.cashIn || state.pop;
      const duration = Onset - state.pressOnset;
      const tokensGained = Tokens - state.previousTokens

      const summaryData = new Map();
      summaryData.set("participant", Participant)
      summaryData.set("trial", Trial)
      summaryData.set("cashIn", state.cashIn)
      summaryData.set("pop", state.pop)
      summaryData.set("totalTokens", cashInOrPop ? Tokens : "NA")
      summaryData.set("pressCount", state.pressCount)
      summaryData.set("tokensGained", tokensGained)
      summaryData.set("duration", duration)
      summaryData.set("reactionTime", state.reactionTime)

      const summaryRow = Array.from(summaryData, ([name, value]) => value).join(",")
      summaryRows.push(summaryRow)
    }
  })
  .on('end', () => {
    const bartSummary = fs.createWriteStream('./bartSummary.csv')
    const summaryFinalString = summaryRows.join("\n")
    bartSummary.write(summaryFinalString)
    console.log("end event: \n", summaryFinalString);
  });
