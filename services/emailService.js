// services/mailService.js

const nodemailer = require("nodemailer");
const config = require("config");

class MailService {
  constructor() {
    // Default configuration
    this.config = {
      host: config.host || "smtp.gmail.com",
      port: config.port || 587,
      secure: config.secure || false,
      service: config.service || "gmail",
      auth: {
        user: config.user || process.env.EMAIL_USER || "Sunidhiratra21@gmail.com",
        pass: config.pass || process.env.EMAIL_PASSWORD || "dxvd nsze negn ksko",
      }
    };
    
    this.transporter = nodemailer.createTransport(this.config);
    
    // Verify connection configuration
     
    this.transporter.verify((error, success) => {
      if (error) {
        console.error("SMTP connection error:", error);
      } else {
        console.log("Mail server is ready to send messages");
      }
    });
  }

  /**
   * Send an email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {string} html - HTML content (optional)
   * @param {string} from - Sender email (optional, uses default if not provided)
   * @returns {Promise} - Promise that resolves with mail info
   */
  async sendMail(to, subject, text, html = null, from = null) {
    try {
      const mailOptions = {
        from: from || process.env.EMAIL_FROM || "sunidhi mail",
        to: to,
        subject: subject,
        text: text
      };
      
      if (html) {
        mailOptions.html = html;
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Message sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  /**
   * Send a verification code email
   * @param {string} to - Recipient email address
   * @param {string} code - Verification code
   * @returns {Promise} - Promise that resolves with mail info
   */
  async sendVerificationCode(to, code) {
    const subject = "Your Verification Code";
    const text = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Verification Required</h2>
        <p>Please use the following code to complete your authentication:</p>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
          <strong>${code}</strong>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        <p style="font-size: 12px; color: #777; margin-top: 30px;">This is an automated message, please do not reply.</p>
      </div>
    `;
    
    return this.sendMail(to, subject, text, html);
  }

  /**
   * Send a welcome email
   * @param {string} to - Recipient email address
   * @param {string} name - User's name
   * @returns {Promise} - Promise that resolves with mail info
   */
  async sendWelcomeEmail(to, name) {
    const subject = "Welcome to Our Trading Platform";
    const text = `Welcome ${name}! Thank you for joining our trading platform. We're excited to have you on board.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to Our Trading Platform!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for creating an account with us. We're excited to have you on board!</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Trade various financial instruments</li>
          <li>Track your investments</li>
          <li>Set up alerts and notifications</li>
          <li>Access premium market analysis</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Happy trading!</p>
      </div>
    `;
    
    return this.sendMail(to, subject, text, html);
  }
}

module.exports = new MailService();