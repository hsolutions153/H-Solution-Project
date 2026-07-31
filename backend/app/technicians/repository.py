fake_technicians_db = [
    {"id": 1, "full_name": "Tech Van C", "email": "techc@gmail.com", "phone": "0911223344", "specialization": "Electric Wheelchair"},
    {"id": 2, "full_name": "Tech Thi D", "email": "techd@gmail.com", "phone": "0988776655", "specialization": "Scooter"}
]

def get_all_technicians():
    return fake_technicians_db

def get_technician_by_id(tech_id: int):
    for tech in fake_technicians_db:
        if tech["id"] == tech_id:
            return tech
    return None

def insert_technician(data: dict):
    fake_technicians_db.append(data)
    return data

def update_technician_in_db(tech_id: int, data: dict):
    for tech in fake_technicians_db:
        if tech["id"] == tech_id:
            for key, value in data.items():
                if value is not None:
                    tech[key] = value
            return tech
    return None

def delete_technician_from_db(tech_id: int):
    for index, tech in enumerate(fake_technicians_db):
        if tech["id"] == tech_id:
            return fake_technicians_db.pop(index)
    return None