import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "demo_key"
});

// Demo mode check
const isDemo = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "demo_key";

export interface StudyArticle {
  title: string;
  content: string;
  sections: {
    title: string;
    content: string;
    type: "definition" | "explanation" | "example" | "formula";
  }[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedReadTime: number;
  suggestedQuestions: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface Quiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
  estimatedTime: number;
}

export async function generateStudyArticle(prompt: string, subject: string): Promise<StudyArticle> {
  if (isDemo) {
    // Return demo content based on the prompt
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    return {
      title: `Understanding ${subject}: ${prompt.split(' ').slice(0, 3).join(' ')}`,
      content: `This comprehensive study guide explores the fundamental concepts of ${subject}. The topic "${prompt}" is essential for building a strong foundation in this subject area.`,
      sections: [
        {
          title: "Definition",
          content: `${subject} is a fundamental concept that involves understanding key principles and their applications. This definition provides the groundwork for deeper exploration.`,
          type: "definition"
        },
        {
          title: "Key Concepts",
          content: `The main concepts include theoretical frameworks, practical applications, and real-world examples that demonstrate the importance of ${subject} in various contexts.`,
          type: "explanation"
        },
        {
          title: "Practical Example",
          content: `Consider a real-world scenario where ${subject} principles are applied: This demonstrates how theoretical knowledge translates into practical solutions.`,
          type: "example"
        },
        {
          title: "Mathematical Framework",
          content: `The mathematical representation often involves equations and formulas that help quantify and predict outcomes related to ${subject}.`,
          type: "formula"
        }
      ],
      difficulty: "intermediate",
      estimatedReadTime: 8,
      suggestedQuestions: [
        `What are the main applications of ${subject}?`,
        `How does this concept relate to other topics?`,
        `Can you provide more examples?`,
        `What are the common misconceptions about this topic?`
      ]
    };
  }

  try {
    const systemPrompt = `You are an expert educational content creator. Generate comprehensive study articles that are clear, engaging, and educational. Focus on the subject: ${subject}. 

Structure your response as a JSON object with the following format:
{
  "title": "Article title",
  "content": "Main introductory content",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content with detailed explanations",
      "type": "definition|explanation|example|formula"
    }
  ],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadTime": number_in_minutes,
  "suggestedQuestions": ["Follow-up question 1", "Follow-up question 2"]
}

Make the content educational, accurate, and include real-world applications where relevant.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content) as StudyArticle;
  } catch (error) {
    console.error("Error generating study article:", error);
    throw new Error("Failed to generate study article: " + (error as Error).message);
  }
}

export async function generateQuiz(topic: string, subject: string, numQuestions: number = 5): Promise<Quiz> {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    return {
      title: `${subject} Quiz: ${topic}`,
      description: `Test your knowledge on ${topic} with this comprehensive quiz covering key concepts and applications.`,
      questions: [
        {
          question: `What is the fundamental principle behind ${topic}?`,
          options: [
            "Conservation of energy",
            "Quantum mechanics",
            "Electromagnetic induction", 
            "Thermodynamic equilibrium"
          ],
          correctAnswer: 0,
          explanation: "The fundamental principle involves the conservation of energy, which states that energy cannot be created or destroyed, only transformed from one form to another.",
          difficulty: "medium"
        },
        {
          question: `Which of the following best describes the practical application of ${topic}?`,
          options: [
            "Only theoretical importance",
            "Used in modern technology",
            "Historical significance only",
            "Future potential applications"
          ],
          correctAnswer: 1,
          explanation: "This concept has significant practical applications in modern technology, from electronics to renewable energy systems.",
          difficulty: "easy"
        },
        {
          question: `What is the mathematical relationship in ${topic}?`,
          options: [
            "Linear relationship",
            "Exponential growth",
            "Inverse proportionality",
            "Logarithmic scale"
          ],
          correctAnswer: 2,
          explanation: "The mathematical relationship often involves inverse proportionality, where one variable increases as another decreases.",
          difficulty: "hard"
        }
      ],
      estimatedTime: 5
    };
  }

  try {
    const systemPrompt = `You are an expert quiz creator for educational content. Create engaging and challenging quiz questions for the subject: ${subject}.

Generate a quiz with ${numQuestions} questions about: ${topic}

Structure your response as a JSON object with the following format:
{
  "title": "Quiz title",
  "description": "Brief description of what the quiz covers",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct",
      "difficulty": "easy|medium|hard"
    }
  ],
  "estimatedTime": number_in_minutes
}

Make questions challenging but fair, with clear explanations for the correct answers.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a quiz about: ${topic}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content) as Quiz;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz: " + (error as Error).message);
  }
}

export async function generateThreadResponse(question: string, context: string, subject: string): Promise<string> {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
    
    const responses = [
      `Great question! Based on the context about ${subject}, here's a detailed explanation: The concept you're asking about involves several key principles that work together to create the observed phenomena. Let me break this down into simpler terms with a practical example.`,
      `That's an excellent follow-up question! In ${subject}, this particular aspect is crucial because it demonstrates how theoretical knowledge applies to real-world scenarios. Consider this example: when we apply these principles in practice, we can see measurable results.`,
      `I'm glad you asked about this! This is a common area where students often need clarification. The key insight here is understanding the relationship between different variables and how they influence the overall system. Let me provide a step-by-step explanation.`,
      `This question touches on a fundamental concept in ${subject}. The answer involves understanding both the theoretical framework and its practical applications. Here's how we can approach this problem systematically.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  try {
    const systemPrompt = `You are a helpful educational AI assistant specializing in ${subject}. 
    
    Provide clear, concise, and educational responses to student questions. Use the provided context to give relevant answers.
    
    Context: ${context}
    
    Guidelines:
    - Be educational and encouraging
    - Provide examples when helpful
    - Keep responses focused and not too lengthy
    - Use proper formatting for clarity`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating thread response:", error);
    throw new Error("Failed to generate response: " + (error as Error).message);
  }
}

export async function getTermDefinition(term: string): Promise<string> {
  if (isDemo) {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
    
    const definitions = {
      "physics": "Physics is the natural science that studies matter, its motion and behavior through space and time, and the related entities of energy and force. It is one of the most fundamental scientific disciplines, with the main goal of understanding how the universe behaves.",
      "energy": "Energy is the quantitative property that must be transferred to an object in order to perform work on, or to heat, the object. It is a conserved quantity and can neither be created nor destroyed, only transformed from one form to another.",
      "momentum": "Momentum is the quantity of motion of a moving body, measured as a product of its mass and velocity. It is a vector quantity, possessing both magnitude and direction, and is conserved in isolated systems.",
      "force": "Force is any interaction that, when unopposed, will change the motion of an object. It can cause an object with mass to change its velocity, direction, or shape. Force is measured in newtons (N).",
      "velocity": "Velocity is the rate of change of the object's position with respect to time and direction. Unlike speed, velocity is a vector quantity that includes both magnitude and direction."
    };
    
    const lowerTerm = term.toLowerCase();
    return definitions[lowerTerm] || `${term} is a fundamental concept in science and education. This term represents an important principle that students should understand as part of their comprehensive learning journey.`;
  }

  try {
    const systemPrompt = `You are an educational dictionary. Provide clear, concise definitions for academic terms.
    
    Format your response as a single paragraph definition that is educational and easy to understand.
    Include the field of study if relevant.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Define: ${term}` }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content || `Definition for "${term}" is not available.`;
  } catch (error) {
    console.error("Error getting term definition:", error);
    throw new Error("Failed to get term definition: " + (error as Error).message);
  }
}

export async function generateStudyPlan(subject: string, goals: string, timeframe: string): Promise<{
  title: string;
  description: string;
  weeks: {
    week: number;
    title: string;
    topics: string[];
    goals: string[];
  }[];
}> {
  try {
    const systemPrompt = `You are an expert study planner. Create detailed study plans that are practical and achievable.

Structure your response as a JSON object with the following format:
{
  "title": "Study plan title",
  "description": "Brief description of the study plan",
  "weeks": [
    {
      "week": 1,
      "title": "Week title",
      "topics": ["Topic 1", "Topic 2"],
      "goals": ["Goal 1", "Goal 2"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a study plan for ${subject}. Goals: ${goals}. Timeframe: ${timeframe}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating study plan:", error);
    throw new Error("Failed to generate study plan: " + (error as Error).message);
  }
}
