import * as fs from 'fs';
import csv from 'csv-parser';

const buttonStata = {
  press: 'press',
  release: 'release',
};

const defaultState = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  pressCount: 0,
  releaseOnset: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  cashInOnset: 0,
  previousTokens: 0,
  reactionTime: -1,
};

let state = {
  buttonStatus: buttonStata.release,
  pressOnset: 0,
  pressCount: 0,
  releaseOnset: 0,
  previousTrial: 0,
  previousParticipant: 0,
  pop: 0,
  cashIn: 0,
  cashInOnset: 0,
  previousTokens: 0,
  reactionTime: -1,
};

const summaryRows = [
  'participant, trial, cashIn, pop, totalTokens,  pressCount, tokensGained, duration, reactionTime',
];

const cleanUpOldFiles = () => {
  fs.stat('./summary/bartSummary.csv', function (err, stats) {
    if (err) {
      return;
    }

    fs.unlink('./summary/bartSummary.csv', function (err) {
      if (err) return console.log(err);
      console.log('file deleted successfully');
    });
  });
};

const generateSummaryRow = (
  state,
  participant,
  trial,
  cashIn,
  pop,
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
        } = bartEvent;

        // cast some bart event data to number type
        Condition = +Condition;
        Tokens = +Tokens;
        Onset = +Onset;
        Trial = +Trial;
        Pop = +Pop;
        CashIn = +CashIn;
        PressPump = +PressPump;
        ReleasePump = +ReleasePump;
        Participant = +Participant;

        // Trial should never be 0
        if (!Trial) return

        // if condition not a number, do not return
        if (!isNaN(Condition) && Condition > 0) return;

        // validate same trial has no cash in nor pop
        if (state.previousTrial === Trial && state.cashIn) {
          return;
        }
        if (state.previousTrial === Trial && state.pop) {
          return;
        }

        if (state.previousTrial !== Trial || state.previousParticipant !== Participant) {
          // resetState(state, defaultState, Participant, Trial, Pop, CashIn);
          state = { ...defaultState };
          state.previousParticipant = Participant;
          state.previousTrial = Trial;
        }

        // check if cash-in or pop
        if (CashIn) state.cashIn = CashIn;
        if (Pop) state.pop = Pop;

        if (state.cashIn) {
          // should a cash in or pop have a reaction time ?
          state.buttonStatus  = buttonStata.release;
          state.cashInOnset = Onset;
          state.reactionTime = state.cashInOnset - state.releaseOnset

          summaryRows.push(
            generateSummaryRow(
              state,
              state.previousparticipant,
              state.previoustrial,
              state.cashIn,
              state.pop,
              Tokens,
              Onset
            )
          );
          return
        }

        if (state.pop) {
          // should a cash in or pop have a reaction time ?
          state.buttonStatus = buttonStata.release;
          state.cashInOnset = Onset;
          state.reactionTime = 'NA'

          summaryRows.push(
            generateSummaryRow(
              state,
              state.previousparticipant,
              state.previoustrial,
              state.cashIn,
              state.pop,
              Tokens,
              Onset
            )
          );
          return
        }

        if (state.buttonStatus === buttonStata.release) {
          if (PressPump === 1) {
            // if this row recorded a button press!
            state.buttonStatus = buttonStata.press;
            state.pressOnset = Onset;
            state.previousTokens = Tokens;
            state.reactionTime = Onset - state.releaseOnset;
          }
          return;
        }

        if (state.buttonStatus === buttonStata.press && ReleasePump === 1) {
          // if this row recorded a release!
          state.buttonStatus = buttonStata.release;
          state.releaseOnset = Onset;
          state.pressCount += 1;

          summaryRows.push(
            generateSummaryRow(
              state,
              state.previousparticipant,
              state.previoustrial,
              state.cashIn,
              state.pop,
              Tokens,
              Onset
            )
          );
          return;
        }
      })
      .on('end', () => {
        if (index === lastFile) {
          const bartSummary = fs.createWriteStream('./summary/bartSummary.csv');
          const summaryFinalString = summaryRows.join('\n');
          bartSummary.write(summaryFinalString);
          console.log('done!');
          console.log(
            'check the summary folder for results: /theBart/summary/bartSummary.csv'
          );
        }
      });
  });
});
