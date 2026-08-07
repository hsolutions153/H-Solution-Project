"""Database mapping for the technician module.

Technician data is split between `users` (account information) and
`technician_profiles` (KYC, skills, location, ratings). The profile primary
key is `user_id`, which references `users.id`.
"""

TECHNICIAN_PROFILES_TABLE = "technician_profiles"
SKILLS = {"WHEELCHAIR", "SCOOTER", "BOTH"}
KYC_STATUSES = {"PENDING", "APPROVED", "REJECTED"}
