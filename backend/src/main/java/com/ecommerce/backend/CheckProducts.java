package com.ecommerce.backend;

import java.sql.*;

public class CheckProducts {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/ecommerce_db", "root", "root");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT id, name, image_url FROM products");
            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id") + " | Name: " + rs.getString("name") + " | ImageURL: " + rs.getString("image_url"));
            }
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
