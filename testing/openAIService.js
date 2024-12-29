const axios = require('axios');
const { OPENAI_API_KEY } = process.env;

const openAIAPIKey = OPENAI_API_KEY; // Replace with your OpenAI API key

exports.filterDataWithOpenAI = async (data) => {
  const prompt = `
    I have a dataset with multiple rows and columns. Here is the dataset:
    
    ${JSON.stringify(data)}

    Please filter out rows based on categories with there counts and show their counts.
    Please show the data in a table format.
    Please try to group the data together and show the counts of each group.
  `;

  const requestData = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 150
  };

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
      headers: {
        'Authorization': `Bearer ${openAIAPIKey}`,
        'Content-Type': 'application/json'
      }
    });

    const filteredData = response.data.choices[0].message.content;
    console.log("filteredData",filteredData);
    return filteredData;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to call OpenAI API');
  }
};
