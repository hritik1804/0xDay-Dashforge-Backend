const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

exports.filterDataWithOpenAI = async (data, prompt) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
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
                    role: "user",
                    content: `Return your analysis as a JSON array in this exact format:
                    [
                        {
                            "category": "Category 1",
                            "insight": "First insight"
                        },
                        {
                            "category": "Category 2",
                            "insight": "Second insight"
                        }
                    ]
                    
                    Analyze this data: ${JSON.stringify(data)}
                    Based on this prompt: ${prompt}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        let analysisText = response.choices[0].message.content;
        
        // Clean up the response to ensure it's valid JSON
        analysisText = analysisText.trim();
        if (!analysisText.startsWith('[')) {
            // If the response doesn't start with '[', try to find the array
            const match = analysisText.match(/\[[\s\S]*\]/);
            if (match) {
                analysisText = match[0];
            }
        }

        // Parse the response into an array
        const analysisArray = JSON.parse(analysisText);

    

        return analysisArray;

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to process data with OpenAI: ' + error.message);
    }
};