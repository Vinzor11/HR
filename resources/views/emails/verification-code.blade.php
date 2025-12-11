<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification Code</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin: 0;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .code-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #ffffff;
            font-family: 'Courier New', monospace;
        }
        .message {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 12px;
            font-size: 13px;
            color: #856404;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Email Verification</h1>
        </div>
        
        <p class="greeting">Hello {{ $userName }},</p>
        
        <p class="message">
            Thank you for registering with our HR System. To complete your registration, 
            please enter the following verification code:
        </p>
        
        <div class="code-container">
            <div class="code">{{ $code }}</div>
        </div>
        
        <p class="message">
            This code will expire in <strong>10 minutes</strong>. 
            If you didn't request this code, please ignore this email.
        </p>
        
        <div class="warning">
            ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. 
            Our team will never ask you for this code.
        </div>
        
        <div class="footer">
            <p>This is an automated message from the HR System.</p>
            <p>© {{ date('Y') }} HR System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

