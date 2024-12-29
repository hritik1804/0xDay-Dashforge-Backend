// ... existing code ...
  if (data.crew) {
    try {
      let validJsonString = data.crew
        .replace(/'/g, '"')          // Replace single quotes with double quotes
        .replace(/None/g, 'null')    // Replace 'None' with null
        .replace(/True/g, 'true')    // Replace 'True' with true
        .replace(/False/g, 'false')  // Replace 'False' with false
        .replace(/"\s+/g, '"')       // Remove spaces after quotes
        .replace(/\s+"/g, '"')       // Remove spaces before quotes
        .replace(/\n/g, '')          // Remove newlines
        .replace(/\r/g, '')          // Remove carriage returns
        .trim();                     // Trim whitespace

      // Check if the string starts and ends with brackets
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
// ... existing code ...