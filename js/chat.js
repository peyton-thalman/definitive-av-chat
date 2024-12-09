class ChatBot {
    constructor() {
        console.log('Initializing chat elements...');
        this.chatMessages = document.getElementById('chatMessages');
        console.log('chatMessages:', this.chatMessages);
        this.userInput = document.getElementById('userInput');
        console.log('userInput:', this.userInput);
        this.sendButton = document.getElementById('sendButton');
        console.log('sendButton:', this.sendButton);
        
        this.clientData = {};
        this.currentStage = 'name';
        
        this.systemPrompt = `You are an intelligent assistant for Definitive AV, specializing in luxury home technology and entertainment systems.

Start with: "Hi! I'm your Definitive AV project guide. I'm excited to learn about your vision for your home technology project! What type of project are you interested in? (For example: home theater, whole-home audio, smart home automation, etc.)"

Keep responses concise and friendly. Guide the conversation in this order:

<strong>Project Details (Ask First):</strong>
- Type of project (home theater, media room, etc.)
- Which rooms are involved
- Timeline with target completion date
- Project Phase: Ask if they are:
  • Ready to start within the next 30 days
  • Planning for the next 1-3 months
  • Planning for 3+ months out
  • Just exploring options

<strong>Budget & Preferences:</strong>
- Budget range (mention we specialize in luxury projects typically over $10,000)
- If they aren't comfortable sharing a budget, ask if they have a rough range in mind
- Must-have features
- Experience with high-end AV
- Preferred brands (if any)

<strong>Technical Requirements:</strong>
- Room dimensions (if applicable)
- Desired features
- Integration needs
- Style preferences

<strong>Contact Details (Ask Last, One at a Time):</strong>
Say something like: "Your project sounds exciting! To have our team prepare a customized solution, I just need your contact information. First, what is your full name?"

Then ask one at a time:
1. After getting name: "Thanks [name]! What city and state are you in, and what's your zip code?"
2. After location: "Perfect! What's the best email to reach you at?"
3. After email: "Great! Finally, what's the best phone number to reach you at as a backup?"
4. After all info: "Thank you! Here's what I have for your contact information:
   - Name: [their name]
   - Location: [their location]
   - Email: [their email]
   - Phone: [their phone]
   Is this correct?"

When discussing budget, provide these typical ranges:
- Home Theater: "For a luxury home theater, projects typically range from $30,000-$100,000+ depending on equipment and features. This includes premium audio/video equipment, custom seating, acoustic treatments, and professional installation."
- Whole-Home Audio: "Whole-home audio systems typically start at $15,000 and can range up to $50,000+ depending on the number of rooms and equipment quality."
- Smart Home Automation: "Complete smart home systems typically start at $20,000 and can range up to $100,000+ depending on the scope and complexity."`;

        this.conversationHistory = [{
            role: 'system',
            content: this.systemPrompt
        }];

        this.submitTimeout = null;

        // Initialize event listeners
        this.initializeEventListeners();

        // Add chat button functionality
        const chatButton = document.getElementById('chatButton');
        const chatContainer = document.getElementById('chatContainer');
        const closeChat = document.getElementById('closeChat');

        chatButton.addEventListener('click', () => {
            chatContainer.classList.remove('hidden');
            // Focus the input when chat opens
            this.userInput.focus();
        });

        closeChat.addEventListener('click', () => {
            chatContainer.classList.add('hidden');
        });
    }

    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        
        this.userInput.addEventListener('keydown', (e) => {
            // Allow new line with Shift+Enter
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserInput();
            }
            
            // Auto-adjust height based on content
            this.adjustInputHeight();
        });

        // Add input event listener for when content changes
        this.userInput.addEventListener('input', () => {
            this.adjustInputHeight();
        });
    }

    adjustInputHeight() {
        const input = this.userInput;
        input.style.height = 'auto'; // Reset height
        input.style.height = (input.scrollHeight) + 'px'; // Set to scroll height
    }

    async init() {
        await this.startConversation();
    }

    async startConversation() {
        try {
            console.log('Starting conversation...');
            const initialResponse = await this.getAIResponse(true);
            console.log('Got initial response:', initialResponse);
            this.addMessage('bot', initialResponse);
            
            // Add the initial response to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: initialResponse
            });
        } catch (error) {
            console.error('Failed to start conversation:', error);
            // Updated fallback message to match the system prompt's initial question
            this.addMessage('bot', "Hi! I'm your Definitive AV project guide. I'm excited to learn about your vision for your home technology project! What type of project are you interested in? (For example: home theater, whole-home audio, smart home automation, etc.)");
        }
    }

    async handleUserInput() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        this.userInput.value = '';
        this.conversationHistory.push({ role: 'user', content: message });

        this.showTypingIndicator();

        try {
            const aiResponse = await this.getAIResponse();
            this.hideTypingIndicator();
            this.addMessage('bot', aiResponse);
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });

            // Check if we have all required information
            const contactInfo = this.extractContactInfo();
            const hasAllInfo = contactInfo.email && 
                             contactInfo.phone && 
                             this.extractClientName() !== 'Unknown Client' &&
                             this.extractLocation() !== 'Location not provided';

            if (hasAllInfo) {
                this.showSubmitButton();
                this.startAutoSubmitTimer();
            }

        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.addMessage('bot', 'I apologize, but I encountered an error. Could you please try again?');
        }
    }

    showSubmitButton() {
        if (!document.querySelector('.submit-proposal-btn')) {
            const button = document.createElement('button');
            button.className = 'submit-proposal-btn';
            button.textContent = 'Submit My Proposal';
            button.onclick = () => this.completeScreening();
            
            document.querySelector('.chat-container').appendChild(button);
        }
    }

    startAutoSubmitTimer() {
        if (this.submitTimeout) {
            clearTimeout(this.submitTimeout);
        }
        this.submitTimeout = setTimeout(() => {
            this.completeScreening();
        }, 60000); // 60 seconds
    }

    addMessage(sender, message) {
        if (!this.chatMessages) {
            console.error('Chat messages container not found!');
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Convert markdown to HTML
        const formattedMessage = message.replace(
            /\*\*(.*?)\*\*/g, 
            '<strong>$1</strong>'
        );
        
        messageDiv.innerHTML = formattedMessage;
        this.chatMessages.appendChild(messageDiv);
        
        // Always scroll to bottom when new message is added
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (!this.chatMessages) return;
        
        // Force scroll to bottom immediately
        requestAnimationFrame(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            
            // Double-check scroll position
            setTimeout(() => {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }, 50);
        });
    }

    async getAIResponse(isInitial = false) {
        const messages = isInitial ? 
            [{ 
                role: 'system', 
                content: this.systemPrompt 
            }, {
                role: 'user',
                content: 'Start the conversation.'
            }] : 
            this.conversationHistory;

        try {
            console.log('Sending request with messages:', messages);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.apiConfig.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 250
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error in getAIResponse:', error);
            throw error;
        }
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = this.chatMessages.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async completeScreening() {
        if (this.isCompleting) return;
        
        this.isCompleting = true;
        clearTimeout(this.submitTimeout);
        
        try {
            const projectInfo = this.extractProjectInfo();
            const contactInfo = this.extractContactInfo();
            const featuresAndStyle = this.extractFeaturesAndStyle();
            
            const clientData = {
                client_name: this.extractClientName(),
                client_email: contactInfo.email || 'Not provided',
                client_phone: contactInfo.phone || 'Not provided',
                client_location: this.extractLocation(),
                project_type: projectInfo.type,
                timeline: projectInfo.timeline,
                budget: projectInfo.budget,
                requirements: projectInfo.requirements,
                features: featuresAndStyle.features,
                style: featuresAndStyle.style,
                message: this.formatFullConversation()
            };

            console.log('Extracted client data:', clientData);
            
            if (clientData.client_email === 'Not provided' || clientData.client_phone === 'Not provided') {
                this.addMessage('bot', 'I still need your contact information to submit your project. Could you please provide your email and phone number?');
                this.isCompleting = false;
                return;
            }

            await EmailService.sendEmail(clientData);
            this.addMessage('bot', 'Thank you! Your information has been submitted successfully. Our team will be in touch soon!');
        } catch (error) {
            console.error('Error in completion:', error);
            this.addMessage('bot', 'There was an error processing your information. Please try again.');
        } finally {
            setTimeout(() => {
                this.isCompleting = false;
            }, 2000);
        }
    }

    formatFullConversation() {
        return this.conversationHistory
            .filter(msg => msg.role !== 'system') // Exclude system messages
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');
    }

    extractTimeline() {
        const timelineMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' &&
            (msg.content.toLowerCase().includes('month') || 
             msg.content.toLowerCase().includes('day') ||
             msg.content.toLowerCase().includes('week'))
        );
        return timelineMessages.length > 0 ? timelineMessages[0].content : 'Timeline not specified';
    }

    testPDFGeneration() {
        const testData = {
            name: "John Doe",
            contact: "john@example.com",
            projectType: "New Construction",
            budget: "$50,000 - $100,000",
            timeline: "Q3 2024",
            location: "Los Angeles, CA",
            requirements: "Looking to install a home theater system with premium audio",
            contactTime: "Afternoons"
        };
        
        this.clientData = testData;
        this.completeScreening();
    }

    // Add these helper methods to extract information from conversation history
    extractClientName() {
        // Look specifically for the name after the prompt about full name
        const nameMessages = this.conversationHistory.filter(msg => {
            const prevMessage = this.conversationHistory[this.conversationHistory.indexOf(msg) - 1];
            return msg.role === 'user' && 
                   prevMessage?.content?.toLowerCase().includes('what is your full name');
        });
        return nameMessages[0]?.content || 'Unknown Client';
    }

    extractContactInfo() {
        const allText = this.conversationHistory.map(msg => msg.content).join(' ');
        const email = allText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i)?.[0] || '';
        const phone = allText.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)?.[0] || '';
        
        return {
            email: email,
            phone: phone
        };
    }

    extractLocation() {
        const locationMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' && 
            (/\d{5}/.test(msg.content) || 
             msg.content.toLowerCase().includes('zip'))
        );
        return locationMessages[0]?.content || 'Location not provided';
    }

    extractProjectType() {
        const projectMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' &&
            (msg.content.toLowerCase().includes('theater') ||
             msg.content.toLowerCase().includes('renovation') ||
             msg.content.toLowerCase().includes('upgrade'))
        );
        return projectMessages[0]?.content || 'Project type not specified';
    }

    extractTimeline() {
        const timelineMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' &&
            (msg.content.toLowerCase().includes('month') || 
             msg.content.toLowerCase().includes('day') ||
             msg.content.toLowerCase().includes('week'))
        );
        return timelineMessages[0]?.content || 'Timeline not specified';
    }

    extractBudget() {
        const budgetMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' &&
            (msg.content.includes('k') || 
             msg.content.includes('$') ||
             /\d{4,}/.test(msg.content))
        );
        return budgetMessages[0]?.content || 'Budget not specified';
    }

    extractRequirements() {
        const requirementMessages = this.conversationHistory.filter(msg =>
            msg.role === 'user' &&
            (msg.content.includes('sq ft') ||
             msg.content.includes('square feet') ||
             /\d{3,}/.test(msg.content))
        );
        return requirementMessages.map(msg => msg.content).join(', ') || 'Requirements not specified';
    }

    testCompletion() {
        console.log('Testing completion process...');
        this.conversationHistory = [
            {role: 'user', content: 'My name is Test User'},
            {role: 'user', content: 'test@email.com and phone 1234567890'},
            {role: 'user', content: 'I live in New York City, NY'},
            {role: 'user', content: 'New construction with 3 months timeline'},
            {role: 'user', content: 'Budget $50,000 for home theater'}
        ];
        this.completeScreening();
    }

    // New helper method to extract project information
    extractProjectInfo() {
        const conversations = this.conversationHistory.map(msg => msg.content.toLowerCase());
        
        return {
            type: this.extractProjectType(),
            timeline: this.extractTimeline(),
            budget: this.extractBudget(),
            requirements: this.extractRequirements()
        };
    }

    // Add new method to extract features and style
    extractFeaturesAndStyle() {
        const allText = this.conversationHistory.map(msg => msg.content.toLowerCase()).join(' ');
        
        // Extract features
        const features = [];
        if (allText.includes('projector')) features.push('Projector');
        if (allText.includes('surround sound') || allText.includes('sonos')) features.push('Surround Sound');
        if (allText.includes('smart') || allText.includes('alexa')) features.push('Smart Home Integration');
        if (allText.includes('acoustic')) features.push('Acoustic Treatments');
        
        // Extract style
        let style = 'Not specified';
        if (allText.includes('modern')) style = 'Modern';
        if (allText.includes('classic')) style = 'Classic';
        if (allText.includes('contemporary')) style = 'Contemporary';
        
        return {
            features: features.join(', ') || 'Not specified',
            style: style
        };
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing chatbot...');
    const chatBot = new ChatBot();
    window.chatBot = chatBot;
    
    // Initialize EmailJS
    EmailService.init();
    
    try {
        await chatBot.init();
        console.log('Chatbot initialized successfully');
    } catch (error) {
        console.error('Failed to initialize chatbot:', error);
    }
});
// For testing, uncomment this line:
// window.chatBot.testPDFGeneration();

