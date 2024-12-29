const csvParser = require('csv-parser');
const fs = require('fs');

exports.parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Parse CSV file dynamically
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        results.push(row); // Push each row into results array
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
        resolve(results); // Return parsed data
      })
      .on('error', (error) => {
        reject(error); // Reject in case of error
      });
  });
};
