require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Initialize Gemini API with your key
const genAI = new GoogleGenerativeAI('AIzaSyALXPv3-Xr6L141KHqc37Sa1N-_VXcXcbs');

// Tax calculation function
function calculateTax(income, exemptions = 0, taxRegime = 'new') {
    let tax = 0;
    let taxBreakdown = [];
    const taxableIncome = Math.max(0, income - (taxRegime === 'old' ? exemptions : 0));

    if (taxRegime === 'new') {
        // New Tax Regime FY 2024-25
        if (taxableIncome <= 300000) {
            tax = 0;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
        } else if (taxableIncome <= 600000) {
            tax = (taxableIncome - 300000) * 0.05;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "3,00,001 - 6,00,000", rate: "5%", amount: tax });
        } else if (taxableIncome <= 900000) {
            tax = 15000 + (taxableIncome - 600000) * 0.10;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "3,00,001 - 6,00,000", rate: "5%", amount: 15000 });
            taxBreakdown.push({ slab: "6,00,001 - 9,00,000", rate: "10%", amount: tax - 15000 });
        } else if (taxableIncome <= 1200000) {
            tax = 45000 + (taxableIncome - 900000) * 0.15;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "3,00,001 - 6,00,000", rate: "5%", amount: 15000 });
            taxBreakdown.push({ slab: "6,00,001 - 9,00,000", rate: "10%", amount: 30000 });
            taxBreakdown.push({ slab: "9,00,001 - 12,00,000", rate: "15%", amount: tax - 45000 });
        } else if (taxableIncome <= 1500000) {
            tax = 90000 + (taxableIncome - 1200000) * 0.20;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "3,00,001 - 6,00,000", rate: "5%", amount: 15000 });
            taxBreakdown.push({ slab: "6,00,001 - 9,00,000", rate: "10%", amount: 30000 });
            taxBreakdown.push({ slab: "9,00,001 - 12,00,000", rate: "15%", amount: 45000 });
            taxBreakdown.push({ slab: "12,00,001 - 15,00,000", rate: "20%", amount: tax - 90000 });
        } else {
            tax = 150000 + (taxableIncome - 1500000) * 0.30;
            taxBreakdown.push({ slab: "0 - 3,00,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "3,00,001 - 6,00,000", rate: "5%", amount: 15000 });
            taxBreakdown.push({ slab: "6,00,001 - 9,00,000", rate: "10%", amount: 30000 });
            taxBreakdown.push({ slab: "9,00,001 - 12,00,000", rate: "15%", amount: 45000 });
            taxBreakdown.push({ slab: "12,00,001 - 15,00,000", rate: "20%", amount: 60000 });
            taxBreakdown.push({ slab: "Above 15,00,000", rate: "30%", amount: tax - 150000 });
        }
    } else {
        // Old Tax Regime FY 2024-25
        if (taxableIncome <= 250000) {
            tax = 0;
            taxBreakdown.push({ slab: "0 - 2,50,000", rate: "0%", amount: 0 });
        } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 250000) * 0.05;
            taxBreakdown.push({ slab: "0 - 2,50,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "2,50,001 - 5,00,000", rate: "5%", amount: tax });
        } else if (taxableIncome <= 1000000) {
            tax = 12500 + (taxableIncome - 500000) * 0.20;
            taxBreakdown.push({ slab: "0 - 2,50,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "2,50,001 - 5,00,000", rate: "5%", amount: 12500 });
            taxBreakdown.push({ slab: "5,00,001 - 10,00,000", rate: "20%", amount: tax - 12500 });
        } else {
            tax = 112500 + (taxableIncome - 1000000) * 0.30;
            taxBreakdown.push({ slab: "0 - 2,50,000", rate: "0%", amount: 0 });
            taxBreakdown.push({ slab: "2,50,001 - 5,00,000", rate: "5%", amount: 12500 });
            taxBreakdown.push({ slab: "5,00,001 - 10,00,000", rate: "20%", amount: 100000 });
            taxBreakdown.push({ slab: "Above 10,00,000", rate: "30%", amount: tax - 112500 });
        }
    }

    // Calculate cess (4% of tax)
    const cess = tax * 0.04;
    const totalTax = tax + cess;

    // Calculate effective tax rate
    const effectiveTaxRate = (totalTax / income) * 100;

    return {
        grossIncome: income,
        exemptions: exemptions,
        taxableIncome: taxableIncome,
        tax: tax,
        cess: cess,
        totalTax: totalTax,
        effectiveTaxRate: effectiveTaxRate,
        taxBreakdown: taxBreakdown,
        formula: `Tax Calculation Breakdown:
1. Gross Income = ₹${income.toLocaleString()}
2. Total Exemptions = ₹${exemptions.toLocaleString()}
3. Taxable Income = ₹${taxableIncome.toLocaleString()}
4. Base Tax = ₹${tax.toLocaleString()}
5. Health & Education Cess = ₹${cess.toLocaleString()}
6. Total Tax = ₹${totalTax.toLocaleString()}
7. Effective Tax Rate = ${effectiveTaxRate.toFixed(2)}%`
    };
}

// Root route
app.get("/", (req, res) => {
    res.send("✅ Tax Calculator API Server is running!");
});

// Chatbot endpoint
app.post("/api/chat", async (req, res) => {
    try {
        const { message, type, income, exemptions, taxRegime } = req.body;

        // Handle tax calculation
        if (income) {
            const taxData = calculateTax(Number(income), Number(exemptions), taxRegime);
            
            // Get AI explanation using Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `As a tax expert, explain this tax calculation in simple terms:
            Income: ₹${income}
            Exemptions: ₹${exemptions}
            Tax Regime: ${taxRegime}
            Taxable Income: ₹${taxData.taxableIncome}
            Total Tax: ₹${taxData.totalTax}
            
            Explain:
            1. How the tax is calculated
            2. Why this amount of tax is applicable
            3. Any tax-saving suggestions`;

            try {
                const result = await model.generateContent(prompt);
                const explanation = await result.response.text();
                taxData.explanation = explanation;
            } catch (aiError) {
                console.error("AI Error:", aiError);
                taxData.explanation = "Tax calculation completed. (AI explanation unavailable)";
            }

            res.json(taxData);
        }
        // Handle general tax queries
        else if (type === 'query') {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `As an Indian tax expert, answer this question: ${message}
            
            Consider:
            1. Latest tax laws and regulations
            2. Provide practical examples if relevant
            3. Include any applicable exemptions or deductions
            4. Keep the response clear and easy to understand`;

            const result = await model.generateContent(prompt);
            const response = await result.response.text();
            res.json({ reply: response });
        }
        else {
            res.status(400).json({ error: "Please provide income amount or a question" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            error: "Failed to process your request. Please try again.",
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
