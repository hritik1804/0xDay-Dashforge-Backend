const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load the CSV file and convert it to JSON
const loadCSV = (fileName) => {
    const filePath = path.join(__dirname, fileName); // Use relative path based on current directory

    return new Promise((resolve, reject) => {
         
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                if (data.crew) {
                    try {
                        let validJsonString = data.crew
                            .replace(/'/g, '"')         
                            .replace(/None/g, 'null')    
                            .replace(/True/g, 'true')    
                            .replace(/False/g, 'false')  
                            .replace(/"\s+/g, '"')       
                            .replace(/\s+"/g, '"')  
                            .replace(/\n/g, '')          
                            .replace(/\r/g, '')          
                            .trim();                    
                        if (!validJsonString.startsWith('[')) validJsonString = '[' + validJsonString;
                        if (!validJsonString.endsWith(']')) validJsonString += ']';

                        const parsedCrew = JSON.parse(validJsonString);
                        data.crew = Array.isArray(parsedCrew) ? parsedCrew : [];

                    } catch (err) {
                        console.error('Error parsing crew field:', err);
                        console.log('Problematic crew string:', data.crew); // Add this line for debugging
                        data.crew = [];
                    }
                } else {
                    data.crew = [];
                }
                results.push(data);
            })
            .on('end', () => {
                resolve(results); 
            })
            .on('error', (err) => {
                reject(err); 
            });
    });
};

// Function to filter data based on some criteria
const filterData = (jsonData, filterCondition) => {
    return jsonData.filter((item) => {
        // Example filter condition
        return filterCondition(item);
    });
};

// Example filter condition: filter rows where the job in crew contains 'Director'
const filterCondition = (item) => {
    return Array.isArray(item.crew) && item.crew.some(crewMember => crewMember.job === 'Director');
};

// Usage
const fileName = 'credits.csv'; 

// Load the CSV and then filter the data
loadCSV(fileName)
    .then((jsonData) => {
        const filteredData = filterData(jsonData, filterCondition);
        console.log(JSON.stringify(filteredData, null, 2));
    })
    .catch((error) => {
        console.error('Error loading CSV:', error);
    });
