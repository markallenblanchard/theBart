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

 const cleanUpOldFiles = () => {
  fs.stat('./summary/bartSummary.csv', function (err, stats) {
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
        let {
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
          Onset,
          Condition
        } = bartEvent;
        // if (Participant === "5.0") console.log("bart event: ", bartEvent)

        X = +X
        Condition = +Condition
        Tokens = +Tokens
        Onset = +Onset
        Trial = +Trial
        Pop = +Pop
        CashIn = +CashIn
        PressPump = +PressPump
        ReleasePump = +ReleasePump
        Participant = +Participant


        //don't start iteration on row 0, or on first row
        // bartEvent[""] is the event number
        // const eventNumber = X
        // if (eventNumber < 1) return

        // console.log("Condition, bartEvent, CashIn, Pop", Condition, bartEvent[""], CashIn, Pop);
        // if condition not a number, do not return

        if (!isNaN(Condition) && Condition > 0) return
        // if (typeof bartEvent[""] !== "number") return


        // validate trial no cash in or pop on same trial as of yet
        if (state.previousTrial === Trial && (state.pop || state.cashIn)) {
          return;
        }

        // check if cash-in or pop
        if ( CashIn ) state.cashIn = CashIn
        if ( Pop ) state.pop = Pop

        if (state.previousTrial !== Trial) {
          state = { ...defaultState };
          state.previousParticipant = Participant
          state.previousTrial = Trial
          state.pop = Pop
          state.cashIn = CashIn
          return;
        }

        if (state.previousParticipant !== Participant) {
          state = { ...defaultState };
          state.previousParticipant = Participant
          state.previousTrial = Trial
          state.pop = Pop
          state.cashIn = CashIn
          return;
        }

        if (state.buttonStatus === buttonStata.release) {
          if (PressPump === 1) { // if this row recorded a button press!
            state.buttonStatus = buttonStata.press;
            state.pressOnset = Onset;
            state.previousTokens = Tokens;
            state.pressCount += 1
          }
        } else if ( ReleasePump === 1) { // if this row recorded a release!
          state.buttonStatus = buttonStata.release;
          state.releaseOnset = Onset
          state.reactionTime =  state.releaseOnset - state.pressOnset;

          //generate summary row
          const cashInOrPop = CashIn || Pop;
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
        } else if ( CashIn === 1 || Pop === 1) {
          state.buttonStatus = buttonStata.release;
          state.releaseOnset = Onset
          state.reactionTime =  state.releaseOnset - state.pressOnset;

          //generate summary row
          const cashInOrPop = CashIn || Pop;
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
          // console.log(summaryRows)
          const bartSummary = fs.createWriteStream('./summary/bartSummary.csv')
          const summaryFinalString = summaryRows.join("\n")
          bartSummary.write(summaryFinalString)
          // console.clear()
          console.log("done!");
          console.log("check the summary folder for results: /theBart/summary/bartSummary.csv");
        }
      });
  })
})
