require("dotenv").config();
const express = require("express");
const app = express();
const mysql = require("mysql2");
const cors = require("cors");

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

let db;
const initializeDbAndServer = async () => {
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false }, 
    });

    db.getConnection((err, connection) => {
      if (err) console.error("DB Connection Failed:", err.message);
      else {
        console.log("Database Connected Successfully!");
        connection.release();
      }
    });

    const port = process.env.PORT || 3004;
    app.listen(port, () => console.log(`Server running at ${port}...`));
  } catch (e) {
    console.log("DB Error: " + e.message);
    process.exit(1);
  }
};

initializeDbAndServer();

//Creating product table and inserting data
app.post("/products", (request, response) => {
  const products = require("./product");

  const values = products.map((p) => [
    p.product_name,
    p.product_category,
    p.product_short_description,
    p.product_long_description,
    p.product_price,
    p.product_image,
    p.product_size,
    p.product_stock,
  ]);

  const creating_product_table_query = `
        CREATE TABLE IF NOT EXISTS product_table(
      product_id INT NOT NULL AUTO_INCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      short_desc TEXT,
      long_desc TEXT,
      price DECIMAL(10, 2),
      image_url TEXT,
      size VARCHAR(100),
      stock VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(product_id)
    )`;

  db.query(creating_product_table_query, (err, result) => {
    if (err) {
      response.status(500).json("Cannot Crate Table");
      return;
    }

    const checkSQL = `SELECT COUNT(*) AS count FROM product_table`;
    db.query(checkSQL, (err, result) => {
      if (err) return res.status(500).json("Error checking products");

      if (result[0].count > 0) {
        return res.status(200).json("Products already inserted");
      }

    const insert_product_details_query = `
            INSERT INTO 
                product_table 
                     (name, category, short_desc,  long_desc,  price, image_url, size, stock)
                VALUES  ? `;

    db.query(insert_product_details_query, [values], (err, result) => {
      if (err) {
        response.status(500).json("Cannot Insert Data");
        return;
      }
      response.status(200).json("Data Inserted Successfully");
    
    });
  });
   })
});

// select all the products based on the filters
app.get("/get_products", (request, response) => {
  const searchByName = request.query.search_by_name || "";
  const filterByCategory = request.query.filter_by_category || "";

  let get_all_products_from_table = `
        SELECT
            *
        FROM
            product_table
        WHERE
       name LIKE ? AND category LIKE ?
       `;

  db.query(
    get_all_products_from_table,
    [`%${searchByName}%`, `%${filterByCategory}%`],
    (err, result) => {
      if (err) {
        response.status(500).json("Cannot Get Product Details");
        return;
      }
      response.status(200).json(result);
    }
  );
});

//Get Single product endpoint
app.get("/product", (request, response) => {
  const productId = request.query.product_id;
  const get_single_product_query = `
        SELECT
            *
        FROM
             product_table 
        WHERE
             product_id = ?`;
  db.query(get_single_product_query, [productId], (err, result) => {
    if (err) {
      response.status(500).json("Cannot Get User Data");
      return;
    }
    response.status(200).json(result);
  });
});

//Creating enquery table and insert data
app.post("/enquiry", (request, response) => {
  const enquiryDetails = request.body;
  const { name, email, mobileNumber, message } = enquiryDetails;

  const create_enquiry_table_query = `
        CREATE TABLE IF NOT EXISTS enquiry_table(
        enquiry_id INTEGER NOT NULL AUTO_INCREMENT,
            product_id INTEGER,
            name TEXT,
            email TEXT, 
            phone VARCHAR(500),
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (enquiry_id),
            FOREIGN KEY (product_id) REFERENCES product_table(product_id)
            )
    `;
  db.query(create_enquiry_table_query, (err, result) => {
    if (err) {
      response.status(500).json("Cannot Create Table");
      return;
    }

    const inser_data_into_enquiry_table_query = `
            INSERT INTO
                enquiry_table (name, email, phone, message)
            VALUES (?, ?, ?, ?)`;
    db.query(
      inser_data_into_enquiry_table_query,
      [name, email, mobileNumber, message],
      (err2, result) => {
        if (err2) {
          response.status(500).json("Cannot Add Enquiry");
          return;
        }
        response.status(200).json("Enquiry Created Successfully");
      }
    );
  });
});
