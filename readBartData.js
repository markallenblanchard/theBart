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

const renderLoading = (number) => {
  const value = number + 1
  if (value % 2 === 0 ) {
    console.clear()
    console.log(loading[1])
  } else if (value % 3 === 0 ) {
    console.clear()
    console.log(loading[2])
  } else if (value % 4 === 0) {
    console.clear()
    console.log(loading[3])
  } else {
    console.clear()
    console.log(loading[0])
  }
}

 const cleanUpOldFiles = () => {
  fs.stat('./summary/bartSummary.csv', function (err, stats) {
    console.log(stats);//here we got all information of file in stats variable

    if (err) {
        return console.error(err);
    }

    fs.unlink('./summary/bartSummary.csv',function(err){
         if(err) return console.log(err);
         console.log('file deleted successfully');
    });
 });
 }

const summaryRows = [ "participant, trial, cashIn, pop, totalTokens,  pressCount, tokensGained, duration, reactionTime" ]

fs.readdir('./bart_data/', (err, files) => {
  if (err) throw err
  const totalNumberOfFiles = files.length
  const lastFile = totalNumberOfFiles - 1
  cleanUpOldFiles()

  files.forEach((file, index) => {
    if(file[0] === ".") return
    fs.createReadStream('./bart_data/' + file)
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
        if (index === lastFile) {
          const bartSummary = fs.createWriteStream('./summary/bartSummary.csv')
          const summaryFinalString = summaryRows.join("\n")
          bartSummary.write(summaryFinalString)
          console.clear()
          console.log("done!");
          console.log("check the summary folder for results: /theBart/summary/bartSummary.csv");
        }
      });
  })
})
