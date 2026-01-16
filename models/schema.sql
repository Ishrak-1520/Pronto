CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    business_name VARCHAR(255),
    role ENUM('ROLE_USER', 'ROLE_ADMIN') DEFAULT 'ROLE_USER',
    locale VARCHAR(10) DEFAULT 'bn-BD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_dna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    website_url VARCHAR(500),
    business_name VARCHAR(255),
    industry VARCHAR(255),
    primary_colors JSON,
    fonts JSON,
    logo_image_path VARCHAR(500),
    tone_tags JSON,
    keywords_bn JSON,
    keywords_en JSON,
    imagery_style TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    manually_edited TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_dna_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    goal VARCHAR(255),
    objective TEXT,
    target_audience VARCHAR(255),
    primary_platforms JSON,
    status ENUM('draft', 'active', 'archived') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_dna_id) REFERENCES business_dna(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    campaign_id INT,
    type ENUM('image', 'video', 'copy') NOT NULL,
    file_path VARCHAR(500),
    caption LONGTEXT,
    platform VARCHAR(50) DEFAULT 'generic',
    dimensions VARCHAR(50),
    metadata JSON,
    tone_tags JSON,
    version INT DEFAULT 1,
    is_favorite TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS generation_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    campaign_id INT,
    prompt TEXT,
    asset_types JSON,
    batch_size INT DEFAULT 3,
    status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
    result_asset_ids JSON,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
