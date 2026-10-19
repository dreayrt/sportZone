<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $resetUrl,
        public string $userName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[SportZone] Đặt lại mật khẩu của bạn',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.auth.reset-password',
            text: 'emails.auth.reset-password-text',
            with: [
                'resetUrl' => $this->resetUrl,
                'userName' => $this->userName,
            ],
        );
    }
}
