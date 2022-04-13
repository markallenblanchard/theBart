import * as fs from 'fs';
import csv from 'csv-parser';

const buttonStata = {
  press: 'press',
  release: 'release',
};

const defaultState = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  releaseOnset: 0,
  cashInOnset: 0,
  newBalloonOnset: 0,
  pressCount: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  previousTokens: 0,
  reactionTime: -1,
};

let state = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  releaseOnset: 0,
  cashInOnset: 0,
  newBalloonOnset: 0,
  pressCount: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  previousTokens: 0,
  reactionTime: -1,
};

const summaryRows = [
  'participant,trial,cashIn,pop,totalTokens,pressCount,tokensGained,duration,reactionTime',
];

const cleanUpOldFiles = () => {
  fs.stat('./summary/bart-summary-sync-1.csv', function (err, stats) {
    if (err) {
      return;
    }

    fs.unlink('./summary/bart-summary-sync-1.csv', function (err) {
      if (err) return console.log(err);
      console.log('file deleted successfully');
    });
  });
};

const generateSummaryRow = (
  state,
  tokens,
  onset
) => {
  const cashInOrPop = state.cashIn || state.pop;
  const duration = onset - state.pressOnset;
  const tokensGained = tokens - state.previousTokens;

  const summaryData = new Map();
  summaryData.set('participant', state.previousParticipant);
  summaryData.set('trial', state.previousTrial);
  summaryData.set('cashIn', state.cashIn);
  summaryData.set('pop', state.pop);
  summaryData.set('totalTokens', cashInOrPop ? tokens : 'NA');
  summaryData.set('pressCount', state.pressCount);
  summaryData.set('tokensGained', tokensGained);
  summaryData.set('duration', duration);
  summaryData.set('reactionTime', state.reactionTime);

  return Array.from(summaryData, ([name, value]) => value).join(',');
};

fs.readdir('./bart_data/', (err, files) => {
  if (err) throw err;
  const totalNumberOfFiles = files.length;
  const lastFile = totalNumberOfFiles - 1;
  cleanUpOldFiles();

  files.forEach((file, index) => {
    if (file[0] === '.') return;
    fs.createReadStream('./bart_data/' + file)
      .pipe(csv())
      .on('data', (bartEvent) => {
        let {
          Participant,
          Trial,
          PressPump,
          ReleasePump,
          Tokens,
          CashIn,
          Pop,
          Onset,
          Condition,
          NewBalloon
        } = bartEvent;

        // cast some bart event data to number
        Condition = +Condition;
        Tokens = +Tokens;
        Onset = +Onset;
        Trial = +Trial;
        Pop = +Pop;
        CashIn = +CashIn;
        PressPump = +PressPump;
        ReleasePump = +ReleasePump;
        Participant = +Participant;
        NewBalloon = +NewBalloon;

        // Trial should never be 0
        if (!Trial) return

        if (NewBalloon) state.newBalloonOnset = Onset

        // skip Conditions with 0 value
        if (!isNaN(Condition) && Condition > 0) return;

        // validate same trial has no cash in nor pop
        if (state.previousTrial === Trial && state.cashIn) {
          return;
        }
        if (state.previousTrial === Trial && state.pop) {
          return;
        }

        if (state.previousTrial !== Trial || state.previousParticipant !== Participant) {
          state = { ...defaultState };
          state.previousParticipant = Participant;
          state.previousTrial = Trial;
        }

        // check if cash-in or pop
        if (CashIn) state.cashIn = CashIn;
        if (Pop) state.pop = Pop;

        if (state.cashIn) {
          state.buttonStatus  = buttonStata.release;
          state.cashInOnset = Onset;
          state.reactionTime = state.cashInOnset - state.releaseOnset

          summaryRows.push( generateSummaryRow( state, Tokens, Onset ) );
          return
        }

        if (state.pop) {
          state.buttonStatus = buttonStata.release;
          state.reactionTime = 'NA'

          summaryRows.push( generateSummaryRow( state, Tokens, Onset ) );
          return
        }

        if (state.buttonStatus === buttonStata.release) {
          // if this row recorded a button press!
          if (PressPump === 1) {
            const balloonOnsetOrReleaseOnset = state.newBalloonOnset ? state.newBalloonOnset : state.releaseOnset
            state.buttonStatus = buttonStata.press;
            state.pressOnset = Onset;
            state.previousTokens = Tokens;
            state.reactionTime = Onset - balloonOnsetOrReleaseOnset;
            if(state.newBalloonOnset) state.newBalloonOnset = 0
          }
          return;
        }

        // if this row recorded a release!
        if (state.buttonStatus === buttonStata.press && ReleasePump === 1) {
          state.buttonStatus = buttonStata.release;
          state.releaseOnset = Onset;
          state.pressCount += 1;

          summaryRows.push( generateSummaryRow( state, Tokens, Onset ) );
          return;
        }
      })
      .on('end', () => {
        if (index === lastFile) {
          const bartSummary = fs.createWriteStream('./summary/bart-summary-sync-1.csv');
          summaryRows.sort((participant1, participant2) => {
            const p1 = participant1.split(',')
            const p2 = participant2.split(',')
            if (isNaN(+p2[0])) return participant2
            return +p1[0] - +p2[0]
          })
          const summaryFinalString = summaryRows.join('\n');
          bartSummary.write(summaryFinalString);
          console.log('done!');
          console.log( 'check the summary folder for results: /theBart/summary/bart-summary-sync-1.csv' );
        }
      });
  });
});
