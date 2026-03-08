use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// Hashes a plaintext password using Argon2id.
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

/// Verifies a plaintext password against a stored Argon2 hash.
pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify_correct_password() {
        let hash = hash_password("my-secure-password").unwrap();
        assert!(verify_password("my-secure-password", &hash).unwrap());
    }

    #[test]
    fn wrong_password_is_rejected() {
        let hash = hash_password("correct-password").unwrap();
        assert!(!verify_password("wrong-password", &hash).unwrap());
    }

    #[test]
    fn different_hashes_for_same_password() {
        let hash1 = hash_password("same-password").unwrap();
        let hash2 = hash_password("same-password").unwrap();
        // Salts differ, so hashes must differ
        assert_ne!(hash1, hash2);
        // But both must verify correctly
        assert!(verify_password("same-password", &hash1).unwrap());
        assert!(verify_password("same-password", &hash2).unwrap());
    }

    #[test]
    fn verify_against_invalid_hash_format_fails() {
        assert!(verify_password("password", "not-a-valid-hash").is_err());
    }

    #[test]
    fn hash_output_is_argon2_format() {
        let hash = hash_password("test").unwrap();
        assert!(hash.starts_with("$argon2"));
    }
}
