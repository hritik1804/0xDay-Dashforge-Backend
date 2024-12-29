const csvParser = require('csv-parser');
const fs = require('fs');

exports.parseCSV = (filePath, queryField, queryValue) => {
  return new Promise((resolve, reject) => {
    const results = [];

    // Parse CSV file dynamically
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        // If queryField is specified, apply the query filter dynamically
        if (queryField && queryValue) {
          if (row[queryField] && row[queryField].toString() === queryValue.toString()) {
            results.push(row); // Only push rows that match the query
          }
        } else {
          // If no queryField is provided, push all rows (no filtering)
          results.push(row);
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
        resolve(results); // Return the filtered or full dataset
      })
      .on('error', (error) => {
        reject(error); // Reject in case of error
      });
  });
};
