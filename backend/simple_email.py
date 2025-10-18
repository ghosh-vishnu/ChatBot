"""
Simple Email System using built-in smtplib
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

def send_email(to_email: str, subject: str, html_content: str):
    """Sends an email using Python's smtplib"""
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = "bitugpt619@gmail.com"
    sender_password = "eyuz gjum ohve gblw"  # Your App Password

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email

    part1 = MIMEText(html_content, 'html')
    msg.attach(part1)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"📧 Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

def send_ticket_confirmation_email(to_email: str, ticket_token: str, user_name: str, user_query: str):
    """Send ticket confirmation email to user"""
    subject = f"Support Ticket Created - {ticket_token}"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 30px 25px; text-align: center; border-bottom: 5px solid #5a67d8; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
            .header p {{ margin: 5px 0 0; font-size: 16px; opacity: 0.9; }}
            .content {{ padding: 25px; color: #333333; line-height: 1.6; }}
            .content h2 {{ color: #5a67d8; font-size: 22px; margin-top: 0; }}
            .content p {{ margin-bottom: 15px; }}
            .ticket-info {{ background-color: #e8f0fe; border-left: 5px solid #5a67d8; padding: 15px 20px; margin: 20px 0; border-radius: 8px; }}
            .ticket-info p {{ margin: 5px 0; }}
            .ticket-info strong {{ color: #333333; }}
            .footer {{ background-color: #f0f4f8; color: #777777; text-align: center; padding: 20px 25px; font-size: 13px; border-top: 1px solid #e0e6ed; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Venturing Digitally</h1>
                <p>Support Ticket Confirmation</p>
            </div>
            <div class="content">
                <h2>Hello {user_name}!</h2>
                <p>Thank you for contacting Venturing Digitally Support. Your support ticket has been successfully created.</p>
                
                <div class="ticket-info">
                    <p><strong>Ticket Token:</strong> {ticket_token}</p>
                    <p><strong>Your Query:</strong> {user_query}</p>
                    <p><strong>Status:</strong> Pending</p>
                </div>
                
                <p>Our team will review your request and get back to you within 24-48 business hours. We appreciate your patience.</p>
                <p>You can reply to this email if you have any additional information or questions regarding your ticket.</p>
                <p>Best regards,<br>The Venturing Digitally Team</p>
            </div>
            <div class="footer">
                &copy; {datetime.now().year} Venturing Digitally. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_content)

def send_ticket_resolution_email(to_email: str, ticket_token: str, user_name: str, resolution_notes: Optional[str] = None):
    """Send ticket resolution email to user"""
    subject = f"Support Ticket Resolved - {ticket_token}"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 30px 25px; text-align: center; border-bottom: 5px solid #047857; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
            .header p {{ margin: 5px 0 0; font-size: 16px; opacity: 0.9; }}
            .content {{ padding: 25px; color: #333333; line-height: 1.6; }}
            .content h2 {{ color: #10b981; font-size: 22px; margin-top: 0; }}
            .content p {{ margin-bottom: 15px; }}
            .ticket-info {{ background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 8px; }}
            .ticket-info p {{ margin: 5px 0; }}
            .ticket-info strong {{ color: #333333; }}
            .footer {{ background-color: #f0f4f8; color: #777777; text-align: center; padding: 20px 25px; font-size: 13px; border-top: 1px solid #e0e6ed; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Venturing Digitally</h1>
                <p>Support Ticket Resolution</p>
            </div>
            <div class="content">
                <h2>Hello {user_name}!</h2>
                <p>Great news! Your support ticket has been resolved by our team.</p>
                
                <div class="ticket-info">
                    <p><strong>Ticket Token:</strong> {ticket_token}</p>
                    <p><strong>Status:</strong> Resolved</p>
                    {f"<p><strong>Resolution Notes:</strong> {resolution_notes}</p>" if resolution_notes else ""}
                </div>
                
                <p>We hope this resolves your issue. If you have any further questions or need additional assistance, please don't hesitate to create a new support ticket.</p>
                <p>Thank you for choosing Venturing Digitally!</p>
                <p>Best regards,<br>The Venturing Digitally Team</p>
            </div>
            <div class="footer">
                &copy; {datetime.now().year} Venturing Digitally. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_content)

def test_email():
    """Test email functionality"""
    print("Testing simple email system...")
    
    success = send_ticket_confirmation_email(
        to_email="vishnughosh.ds@gmail.com",
        ticket_token="TKT-TEST123",
        user_name="Test User",
        user_query="This is a test query for email notification."
    )
    
    if success:
        print("✅ Test email sent successfully!")
        print("📬 Please check your email: vishnughosh.ds@gmail.com")
        print("📁 Also check spam folder if not in inbox")
    else:
        print("❌ Test email failed!")
        print("\n🔧 To fix this issue:")
        print("1. Enable 2-Factor Authentication on your Gmail account")
        print("2. Generate an App Password: https://myaccount.google.com/apppasswords")
        print("3. Update the sender_password in simple_email.py with your App Password")
        print("4. Make sure you're using App Password, not your regular Gmail password")

if __name__ == "__main__":
    test_email()