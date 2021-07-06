const spicedPG = require("spiced-pg");

const db = spicedPG(
    process.env.DATABASE_URL ||
        "postgres:bennidorp:postgres@localhost:5432/petition"
);

exports.addSignature = (userId, signatureCode) => {
    return db.query(
        `INSERT INTO signatures
            (user_id, signature_code)
            VALUES ($1, $2)
            RETURNING *;`,
        [userId, signatureCode]
    );
};

exports.addProfile = (userId, age, city, homepage) => {
    return db.query(
        `INSERT INTO profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4);`,
        [userId, age, city, homepage]
    );
};

exports.getSigners = () => {
    return db.query(`
    SELECT
    firstname, lastname, email, age, city, homepage
    FROM
    signatures
    JOIN
    users
    ON (signatures.user_id = users.id)
    JOIN
    profiles
    ON (profiles.user_id = users.id);`);
};

exports.getSignature = (id) => {
    return db.query("SELECT * FROM signatures WHERE id=$1;", [id]);
};

exports.getSignatureForUserId = (userId) => {
    return db.query("SELECT * FROM signatures WHERE user_id=$1;", [userId]);
};

exports.addUser = (firstname, lastname, email, password) => {
    //console.log("db", db);
    return db.query(
        `INSERT INTO users (firstname, lastname, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, firstname, lastname`,
        [firstname, lastname, email, password]
    );
};

/*
exports.addUser = (firstname, lastname, email, password) => {
    return db.query(
        `INSERT INTO users (firstname, lastname, email, password_hash)
                        VALUES ($1,$2,$3,$4) RETURNING id, firstname, lastname`,
        [firstname, lastname, email, password]
    );
};
*/

exports.getUserByEmail = (emailAddress) => {
    return db.query("SELECT * FROM users WHERE email=$1;", [emailAddress]);
};

// Raus

exports.getUser = (userId) => {
    return db.query("SELECT * FROM users WHERE id=$1;", [userId]);
};

exports.getProfileForUserId = (userId) => {
    return db.query("SELECT * FROM profiles WHERE user_id = $1;", [userId]);
};

exports.updateUser = (userId, firstname, lastname, email) => {
    return db.query(
        ` UPDATE users SET firstname=$1, lastname=$2, email=$3 WHERE id=$4;`,
        [firstname, lastname, email, userId]
    );
};

exports.updateUserPassword = (userId, passwordHash) => {
    return db.query(`UPDATE users SET password_hash=$1 WHERE id=$2;`, [
        passwordHash,
        userId,
    ]);
};

exports.insertOrUpdateProfile = (userId, age, city, homepage) => {
    return db.query(
        `INSERT INTO profiles (user_id, age, city, homepage)
        VALUES
            ($1, $2, $3, $4)
        ON CONFLICT(user_id) DO
            UPDATE
                SET age=$2,
                city=$3,
                homepage=$4;
    `,
        [userId, age, city, homepage]
    );
};

exports.deleteSignature = (userId) => {
    return db.query("DELETE FROM signatures WHERE user_id=$1;", [userId]);
};
