export const navigation = {
  patient: [
    { label: "Overview", to: "/dashboard", icon: "grid" },
    { label: "Find Doctors", to: "/doctors", icon: "doctor" },
    { label: "Book a Nurse", to: "/nurses", icon: "nurse" },
    { label: "My Appointments", to: "/appointments", icon: "calendar" },
    { label: "Medical Reports", to: "/reports", icon: "file" },
    { label: "Payments", to: "/payments", icon: "card" },
    { label: "Settings", to: "/settings", icon: "settings" },
  ],
  nurse: [
    { label: "Overview", to: "/dashboard", icon: "grid" },
    { label: "My Assignments", to: "/appointments", icon: "calendar" },
    { label: "Patient Records", to: "/reports", icon: "file" },
    { label: "Earnings", to: "/payments", icon: "wallet" },
    { label: "Settings", to: "/settings", icon: "settings" },
  ],
  admin: [
    { label: "Overview", to: "/dashboard", icon: "grid" },
    { label: "Settings", to: "/settings", icon: "settings" },
  ],
  doctor: [
    { label: "Overview", to: "/dashboard", icon: "grid" },
    { label: "Appointments", to: "/appointments", icon: "calendar" },
    { label: "Patients", to: "/patients", icon: "users" },
    { label: "Medical Reports", to: "/reports", icon: "file" },
    { label: "Earnings", to: "/payments", icon: "wallet" },
    { label: "Settings", to: "/settings", icon: "settings" },
  ],
};
