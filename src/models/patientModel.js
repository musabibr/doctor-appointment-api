const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Simple email validation regex
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: { type: String, required: true },
    gender: { 
        type: String, 
        enum: ["male", "female"]
    },
    photo: { 
        type: String, 
        default: "https://example.com/default-image.jpg" // Replace with your default image URL
    },
    appointments: [
        {
            doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
            date: { type: Date, required: true },
            status: { 
                type: String, 
                enum: ["scheduled", "completed", "cancelled"], 
                default: "scheduled" 
            },
        },
    ]
},{
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

// Pre-save hook to hash password before saving
patientSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Instance method to compare password
patientSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;

// base on this schema create patient repository and patient service , patient controller and patient routes