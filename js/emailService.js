class EmailService {
    static init() {
        console.log('Initializing EmailJS...');
        emailjs.init("i1Ti60Cex-kvwPaJE");
        console.log('EmailJS initialized');
    }

    static async sendEmail(clientData) {
        try {
            const formattedMessage = `
NEW CLIENT SCREENING REPORT

CONTACT INFORMATION
------------------
Name:     ${clientData.client_name}
Location: ${clientData.client_location}
Email:    ${clientData.client_email}
Phone:    ${clientData.client_phone}

PROJECT DETAILS
--------------
Project Type: ${clientData.project_type}
Timeline:     ${clientData.timeline}
Budget:       ${clientData.budget}

TECHNICAL REQUIREMENTS
--------------------
Room Size:    ${clientData.requirements}
Features:     ${clientData.features || 'Not specified'}
Style:        ${clientData.style || 'Not specified'}

FULL CONVERSATION HISTORY
-----------------------
${clientData.message}`;

            const templateParams = {
                to_name: "Definitive AV Team",
                client_name: clientData.client_name,
                client_email: clientData.client_email,
                client_phone: clientData.client_phone,
                client_location: clientData.client_location,
                project_type: clientData.project_type,
                timeline: clientData.timeline,
                budget: clientData.budget,
                requirements: clientData.requirements,
                message: formattedMessage
            };

            console.log('Sending email with template params:', templateParams);
            
            const response = await emailjs.send(
                "service_ezn7t9w",
                "template_tbtfdcw",
                templateParams
            );
            
            console.log('Email sent successfully:', response);
            return response;
        } catch (error) {
            console.error("Failed to send email:", error);
            throw error;
        }
    }
}

window.EmailService = EmailService; 