"""Database shape used by the devices module.

Supabase table: public.customer_devices
Columns: id, customer_id, device_type, manufacturer, model_name,
serial_number, image_url, notes, frame_number, purchase_date,
created_at, updated_at.
"""

DEVICES_TABLE = "customer_devices"
DEVICE_TYPES = {"wheelchair", "scooter"}
