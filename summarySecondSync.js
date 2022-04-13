import * as fs from 'fs';
import csv from 'csv-parser';

const defaultState = {
  participant: 0,
  totalTokens: 0,
  totalReactionTime: 0,
  totalReactionTimeSansCashPopPress: 0,
  cashInCounter: 0,
  ABS: 0,
  "Ave Cash in RT": 0,
  "Ave Pump RT": 0,
  COT: 0
};

let state = {
  participant: 0,
  totalTokens: 0,
  totalReactionTime: 0,
  totalReactionTimeSansCashPopPress: 0,
  cashInCounter: 0,
  ABS: 0,
  "Ave Cash in RT": 0,
  "Ave Pump RT": 0,
  COT: 0
};

const sync2Rows = [
  'participant,ABS,Ave Cash in RT,Ave Pump RT,COT',
];

const cleanUpOldFiles = () => {
  fs.stat('./sync2/bart-summary-sync-2.csv', function (err, stats) {
    if (err) {
      return;
    }

    fs.unlink('./sync2/bart-summary-sync-2.csv', function (err) {
      if (err) return console.log(err);
      console.log('file deleted successfully');
    });
  });
};

const generateSummaryRow = ( state ) => {
  state.ABS = state.totalTokens / state.cashInCounter
  state["Ave Cash in RT"] = state.totalReactionTime / state.cashInCounter
  state["Ave Pump RT"] = state.totalReactionTimeSansCashPopPress / state.cashInCounter
  state.COT = state["Ave Cash in RT"] / state["Ave Pump RT"]
  const summaryData = new Map();
  summaryData.set('participant', state.participant);
  summaryData.set('ABS', state.ABS);
  summaryData.set('Ave Cash in RT', state["Ave Cash in RT"] );
  summaryData.set('Ave Pump RT', state["Ave Pump RT"]);
  summaryData.set('COT', state.COT);

  return Array.from(summaryData, ([name, value]) => value).join(',');
};

fs.readdir('./summary/', (err, files) => {
  if (err) throw err;
  const totalNumberOfFiles = files.length;
  const lastFile = totalNumberOfFiles - 1;
  cleanUpOldFiles();

  files.forEach((file, index) => {
    if (file[0] === '.') return;
    fs.createReadStream('./summary/' + file)
      .pipe(csv())
      .on('data', (summary) => {
        let {
          participant,
          trial,
          cashIn,
          pop,
          totalTokens,
          pressCount,
          reactionTime,
        } = summary;

        participant = +participant;
        trial = +trial;
        cashIn = +cashIn;
        pop = +pop;
        totalTokens = +totalTokens;
        pressCount = +pressCount;
        reactionTime = +reactionTime;

        if (state.participant === 0) state.participant = participant
        if (state.participant !== participant) {
          sync2Rows.push( generateSummaryRow( state ) );
          state = { ...defaultState };
          state.participant = participant;
        }

        if(!pop) state.totalReactionTime = state.totalReactionTime += reactionTime
        if (!cashIn && !pop && pressCount < 2) {
          state.totalReactionTimeSansCashPopPress = state.totalReactionTimeSansCashPopPress += reactionTime
        }

        if (cashIn) {
          if (isNaN(totalTokens)) {
            console.log("found bad data");
          }
          state.totalTokens = state.totalTokens += totalTokens
          state.cashInCounter = state.cashInCounter += 1
        };
      })
      .on('end', () => {
        if (index === lastFile) {
          sync2Rows.push( generateSummaryRow( state ) );

          const sync2 = fs.createWriteStream('./sync2/bart-summary-sync-2.csv');
          sync2Rows.sort((participant1, participant2) => {
            const p1 = participant1.split(',')
            const p2 = participant2.split(',')
            if (isNaN(+p2[0])) return participant2
            return +p1[0] - +p2[0]
          })
          const syncFinalString = sync2Rows.join('\n');
          sync2.write(syncFinalString);
          console.log('sync 2 complete!');
          console.log( 'check the sync2 folder for results: /theBart/sync2/bart-summary-sync-2.csv' );
        }
      });
  });
});
