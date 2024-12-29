const axios = require('axios');
const { OPENAI_API_KEY } = process.env;

const openAIAPIKey = process.env.OPENAI_API_KEY; // Replace with your OpenAI API key

exports.filterDataWithOpenAI = async (data, userPrompt) => {
  const prompt = `
    I have a dataset with multiple rows and columns. Here is the dataset:
    
    ${JSON.stringify(data)}

    Based on the following user request, please process the data:
    "${userPrompt}"
  `;


  const requestData = {
    model: 'gpt-3.5-turbo',
    messages: [
      { 
        role: 'system', 
        content: `You are a helpful assistant. Please adhere to the following guidelines:
        
        1. Always start your response with an "Overview" section that includes:
           - Total count of records
           - Count by categories (if categories exist)
           - Any notable patterns or distributions
        2. Store data in key-value pairs for easy comparison
        3. When users request charts, the default chart type should be a pie chart
        4. Other chart types (such as bar, line, scatter, etc.) should be accessible if requested
        5. Format your response in a structured JSON with the following structure:
           {
             "overview": {
               "totalCount": number,
               "categoryCounts": object,
               "summary": string
             },
             "analysis": string,
             "chartRecommendation": string (if applicable)
           }`
      },
      { 
        role: 'user', 
        content: prompt 
      }
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
    return filteredData;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to call OpenAI API');
  }
};
