use lettre::{
    message::header::ContentType, transport::smtp::authentication::Credentials, AsyncSmtpTransport,
    AsyncTransport, Message, Tokio1Executor,
};
use tracing::{error, info};

use crate::config::SmtpConfig;

/// Thin wrapper around an async SMTP transport.
#[derive(Clone)]
pub struct EmailService {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from_address: String,
    frontend_url: String,
}

impl EmailService {
    pub fn new(
        config: &SmtpConfig,
        frontend_url: &str,
    ) -> Result<Self, lettre::transport::smtp::Error> {
        let credentials = Credentials::new(config.username.clone(), config.password.clone());

        let transport = AsyncSmtpTransport::<Tokio1Executor>::relay(&config.host)?
            .port(config.port)
            .credentials(credentials)
            .build();

        Ok(Self {
            transport,
            from_address: config.from_address.clone(),
            frontend_url: frontend_url.to_string(),
        })
    }

    /// Sends a password reset email with a one-time token link.
    pub async fn send_password_reset(&self, to_email: &str, token: &str) -> Result<(), EmailError> {
        let reset_link = format!("{}/auth/reset-password?token={}", self.frontend_url, token);

        let body = format!(
            "You requested a password reset for your Pumpkin Hub account.\n\n\
             Click the link below to set a new password:\n\
             {reset_link}\n\n\
             This link expires in 1 hour.\n\n\
             If you did not request this, you can safely ignore this email."
        );

        let message = Message::builder()
            .from(
                self.from_address
                    .parse()
                    .map_err(|e| EmailError::Build(format!("{e}")))?,
            )
            .to(to_email
                .parse()
                .map_err(|e| EmailError::Build(format!("{e}")))?)
            .subject("Pumpkin Hub — Password Reset")
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| EmailError::Build(e.to_string()))?;

        self.transport.send(message).await.map_err(|e| {
            error!(error = %e, "Failed to send password reset email");
            EmailError::Send(e.to_string())
        })?;

        info!(to = to_email, "Password reset email sent");
        Ok(())
    }

    /// Sends an email verification link to a newly registered user.
    pub async fn send_email_verification(
        &self,
        to_email: &str,
        token: &str,
    ) -> Result<(), EmailError> {
        let verify_link = format!("{}/auth/verify-email?token={}", self.frontend_url, token);

        let body = format!(
            "Welcome to Pumpkin Hub!\n\n\
             Please verify your email address by clicking the link below:\n\
             {verify_link}\n\n\
             This link expires in 24 hours.\n\n\
             If you did not create this account, you can safely ignore this email."
        );

        let message = Message::builder()
            .from(
                self.from_address
                    .parse()
                    .map_err(|e| EmailError::Build(format!("{e}")))?,
            )
            .to(to_email
                .parse()
                .map_err(|e| EmailError::Build(format!("{e}")))?)
            .subject("Pumpkin Hub — Verify Your Email")
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| EmailError::Build(e.to_string()))?;

        self.transport.send(message).await.map_err(|e| {
            error!(error = %e, "Failed to send verification email");
            EmailError::Send(e.to_string())
        })?;

        info!(to = to_email, "Email verification sent");
        Ok(())
    }
}

#[derive(Debug)]
pub enum EmailError {
    Build(String),
    Send(String),
}

impl std::fmt::Display for EmailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Build(msg) => write!(f, "Failed to build email: {msg}"),
            Self::Send(msg) => write!(f, "Failed to send email: {msg}"),
        }
    }
}

impl std::error::Error for EmailError {}
