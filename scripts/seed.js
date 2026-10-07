// Fills an empty database with demo data so the app can be explored right away.
//
//   npm run seed               # only runs on an empty database
//   npm run seed -- --reset    # wipes the database first (never in production)
//
// This is a development tool: it writes straight to the module models so it can
// create past appointments and reviews that the API would not allow.
const fs = require("fs/promises");
const path = require("path");
const { parseArgs } = require("util");
const mongoose = require("mongoose");

const env = require("../src/shared/config/env");
const { connectToDatabase, disconnectFromDatabase } = require("../src/shared/config/db");
const { encryptData } = require("../src/shared/utils/hash");
const { todayKey, addDays, parseDateKey } = require("../src/shared/utils/time");
const admin = require("../src/modules/admin");
const Patient = require("../src/modules/patients/patient.model");
const Doctor = require("../src/modules/doctors/doctor.model");
const Clinic = require("../src/modules/doctors/clinic.model");
const Appointment = require("../src/modules/appointments/appointment.model");
const Review = require("../src/modules/reviews/review.model");
const Otp = require("../src/modules/auth/otp.model");

const MODELS = [Patient, Doctor, Clinic, Appointment, Review, Otp, require("../src/modules/admin/admin.model")];

const PASSWORDS = { admin: "Admin12345", doctor: "Doctor123", patient: "Patient123" };

const DOCTORS = [
    {
        email: "doctor@example.com",
        name: "Amina Yousif",
        gender: "female",
        phoneNumber: "+249912000001",
        specialty: "Cardiology",
        about: "Consultant cardiologist with 12 years of experience in heart failure, hypertension and preventive cardiology.",
        price: 150,
        discount: 0,
        clinic: { name: "Nile Heart Center", city: "Khartoum", state: "Khartoum", address: "Africa Street, Amarat", services: ["ECG", "Echocardiography", "Blood pressure clinic"] },
    },
    {
        email: "doctor2@example.com",
        name: "Khalid Osman",
        gender: "male",
        phoneNumber: "+249912000002",
        specialty: "Dermatology",
        about: "Dermatologist focused on acne, eczema and skin allergies for adults and teenagers.",
        price: 120,
        discount: 10,
        clinic: { name: "Clear Skin Clinic", city: "Omdurman", state: "Khartoum", address: "Al Arbaeen Street", services: ["Acne treatment", "Allergy testing"] },
    },
    {
        email: "doctor3@example.com",
        name: "Mariam Saleh",
        gender: "female",
        phoneNumber: "+249912000003",
        specialty: "Pediatrics",
        about: "Pediatrician caring for newborns, children and adolescents. Vaccinations and growth follow-up.",
        price: 100,
        discount: 0,
        clinic: { name: "Little Steps Children's Clinic", city: "Khartoum", state: "Khartoum", address: "Riyadh, Block 12", services: ["Vaccinations", "Newborn care"] },
    },
    {
        email: "doctor4@example.com",
        name: "Yasir Mohamed",
        gender: "male",
        phoneNumber: "+249912000004",
        specialty: "Orthopedics",
        about: "Orthopedic surgeon treating sports injuries, back pain and joint problems.",
        price: 180,
        discount: 15,
        clinic: { name: "Bahri Bone & Joint", city: "Bahri", state: "Khartoum", address: "Al Muassasa", services: ["Sports injuries", "Physiotherapy referral"] },
    },
    {
        email: "doctor5@example.com",
        name: "Huda Abdelrahman",
        gender: "female",
        phoneNumber: "+249912000005",
        specialty: "Dentistry",
        about: "Family dentist offering check-ups, fillings, cleaning and whitening.",
        price: 90,
        discount: 0,
        clinic: { name: "Red Sea Dental", city: "Port Sudan", state: "Red Sea", address: "Corniche Road", services: ["Cleaning", "Fillings", "Whitening"] },
    },
    {
        email: "doctor6@example.com",
        name: "Omer Babiker",
        gender: "male",
        phoneNumber: "+249912000006",
        specialty: "Neurology",
        about: "Neurologist with a special interest in migraine, epilepsy and sleep disorders.",
        price: 170,
        discount: 5,
        clinic: { name: "Gezira Neuro Clinic", city: "Wad Madani", state: "Gezira", address: "Hospital Road", services: ["EEG", "Headache clinic"] },
    },
];

const PATIENTS = [
    { email: "patient@example.com", name: "Sara Ahmed", gender: "female", phoneNumber: "+249911000001", location: { city: "Khartoum", state: "Khartoum" } },
    { email: "patient2@example.com", name: "Omar Khalid", gender: "male", phoneNumber: "+249911000002", location: { city: "Omdurman", state: "Khartoum" } },
];

const SLOTS = [
    { start: "09:00", end: "12:00", maxPatients: 4 },
    { start: "16:00", end: "19:00", maxPatients: 4 },
];

// A minimal one-page PDF, used as the pending doctor's sample documents.
const samplePdf = (title) => {
    const text = `BT /F1 22 Tf 72 760 Td (${title}) Tj 0 -32 Td /F1 12 Tf (Demo document generated by the seed script.) Tj ET`;
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, "latin1");
};

const writeSampleDocument = async (name, title) => {
    const directory = path.join(env.UPLOAD_DIR, "documents");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, name), samplePdf(title));
    return `/uploads/documents/${name}`;
};

const buildAvailability = (fromOffset, toOffset) => {
    const today = todayKey();
    const days = [];
    for (let offset = fromOffset; offset <= toOffset; offset++) {
        days.push({
            date: parseDateKey(addDays(today, offset)),
            hours: SLOTS.map((slot) => ({ ...slot, currentPatients: 0 })),
        });
    }
    return days;
};

const main = async () => {
    const { values } = parseArgs({ options: { reset: { type: "boolean", default: false } } });
    if (env.isProduction) throw new Error("Refusing to seed a production database.");

    await connectToDatabase(env.MONGODB_URI);

    if (values.reset) {
        await mongoose.connection.dropDatabase();
        console.log(`Database "${mongoose.connection.name}" wiped.`);
    } else if ((await Doctor.estimatedDocumentCount()) + (await Patient.estimatedDocumentCount()) > 0) {
        console.log('The database already has data. Run "npm run seed -- --reset" to wipe it and load the demo data.');
        await disconnectFromDatabase();
        return;
    }
    await Promise.all(MODELS.map((Model) => Model.syncIndexes()));

    const [doctorHash, patientHash] = await Promise.all([encryptData(PASSWORDS.doctor), encryptData(PASSWORDS.patient)]);

    await admin.createOrUpdateAdmin({ name: "Site Admin", email: "admin@example.com", password: PASSWORDS.admin });

    const licenseUrl = await writeSampleDocument("sample-medical-license.pdf", "Sample medical license");
    const idUrl = await writeSampleDocument("sample-personal-id.pdf", "Sample personal ID");

    const doctors = [];
    for (const data of DOCTORS) {
        const { clinic: clinicData, ...profile } = data;
        const doctor = await Doctor.create({
            ...profile,
            password: doctorHash,
            address: `${clinicData.address}, ${clinicData.city}`,
            medicalLicense: licenseUrl,
            personalID: idUrl,
            isVerified: true,
            approvalStatus: "approved",
            approvedAt: new Date(),
            availability: buildAvailability(-7, 13),
        });
        const clinic = await Clinic.create({
            doctor: doctor._id,
            name: clinicData.name,
            location: { city: clinicData.city, state: clinicData.state, address: clinicData.address },
            contact: { phone: profile.phoneNumber, email: profile.email },
            services: clinicData.services,
        });
        await Doctor.updateOne({ _id: doctor._id }, { $set: { clinic: clinic._id } });
        doctors.push(doctor);
    }

    await Doctor.create({
        email: "pending.doctor@example.com",
        name: "Tarig Elamin",
        gender: "male",
        phoneNumber: "+249912000007",
        specialty: "General Practice",
        about: "Family physician waiting for account approval.",
        address: "Kassala Market Street, Kassala",
        price: 80,
        password: doctorHash,
        medicalLicense: licenseUrl,
        personalID: idUrl,
        isVerified: true,
        approvalStatus: "pending",
    });

    const patients = [];
    for (const data of PATIENTS) patients.push(await Patient.create({ ...data, password: patientHash }));
    const [sara, omar] = patients;
    const [amina, khalid, mariam] = doctors;

    const today = todayKey();
    const finalPrice = (d) => Math.round(d.price * (1 - d.discount / 100) * 100) / 100;

    // Books slot `slotIndex` on the day `offset` days from today and keeps the seat counter in sync.
    const book = async (patient, doctor, offset, slotIndex, extra) => {
        const fresh = await Doctor.findById(doctor._id);
        const day = fresh.availability.find((d) => d.date.getTime() === parseDateKey(addDays(today, offset)).getTime());
        const slot = day.hours[slotIndex];
        const counted = ["pending", "confirmed", "completed"].includes(extra.status);
        if (counted) {
            await Doctor.updateOne(
                { _id: doctor._id },
                { $inc: { "availability.$[d].hours.$[s].currentPatients": 1 } },
                { arrayFilters: [{ "d._id": day._id }, { "s._id": slot._id }] }
            );
        }
        return Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            availability: day._id,
            slot: slot._id,
            appointmentDate: day.date,
            appointmentHour: slot.start,
            endHour: slot.end,
            price: finalPrice(doctor),
            ...extra,
        });
    };

    const review = async (appointment, rating, comment, extra = {}) => {
        const created = await Review.create({
            appointment: appointment._id,
            patient: appointment.patient,
            doctor: appointment.doctor,
            rating,
            comment,
            ...extra,
        });
        await Appointment.updateOne({ _id: appointment._id }, { $set: { review: created._id } });
    };

    // Sara: a reviewed visit, a visit waiting for her review, and two upcoming bookings.
    const saraPast = await book(sara, amina, -3, 0, { status: "completed", reasonForVisit: "Chest pain when climbing stairs", doctorNotes: "ECG normal. Follow up in 3 months." });
    await review(saraPast, 5, "Dr. Amina was very attentive and explained everything clearly.");
    await book(sara, khalid, -5, 1, { status: "completed", reasonForVisit: "Skin rash on both arms" });
    await book(sara, amina, 1, 0, { status: "confirmed", reasonForVisit: "Follow-up visit" });
    await book(sara, mariam, 2, 1, { status: "pending", reasonForVisit: "Vaccination for my son" });

    // Omar: reviews (one of them reported by the doctor) and a pending request for Dr. Amina.
    const omarPast = await book(omar, amina, -7, 1, { status: "completed", reasonForVisit: "Blood pressure check" });
    await review(omarPast, 4, "Good doctor, but I waited 30 minutes.");
    const omarKhalid = await book(omar, khalid, -6, 0, { status: "completed", reasonForVisit: "Acne treatment" });
    await review(omarKhalid, 1, "Terrible!!! Total waste of my time and money.", {
        reported: true,
        reportReason: "The comment is abusive and does not describe the visit.",
        reportedAt: new Date(),
    });
    await book(omar, amina, 2, 1, { status: "pending", reasonForVisit: "Palpitations at night" });
    await book(omar, mariam, -2, 0, { status: "canceled", canceledBy: "patient", cancelReason: "Feeling better" });

    // Ratings are normally maintained through domain events; compute them once here.
    for (const doctor of doctors) {
        const [result] = await Review.aggregate([
            { $match: { doctor: doctor._id } },
            { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        await Doctor.updateOne(
            { _id: doctor._id },
            { $set: { ratingAverage: result ? Math.round(result.average * 10) / 10 : 0, ratingCount: result ? result.count : 0 } }
        );
    }

    console.log("\nDemo data loaded. Sign in with:\n");
    console.table([
        { role: "admin", email: "admin@example.com", password: PASSWORDS.admin },
        { role: "doctor", email: "doctor@example.com", password: PASSWORDS.doctor },
        { role: "doctor (pending approval)", email: "pending.doctor@example.com", password: PASSWORDS.doctor },
        { role: "patient", email: "patient@example.com", password: PASSWORDS.patient },
    ]);
    console.log("Other doctors: doctor2@example.com ... doctor6@example.com, other patient: patient2@example.com (same passwords).\n");

    await disconnectFromDatabase();
};

main().catch(async (error) => {
    console.error(`Seeding failed: ${error.message}`);
    await disconnectFromDatabase().catch(() => {});
    process.exit(1);
});
