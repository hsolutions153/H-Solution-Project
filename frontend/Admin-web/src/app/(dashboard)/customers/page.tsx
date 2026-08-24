import { CustomerFeature } from "@/features/customers";
import { MOCK_CUSTOMERS } from "@/constants/mockCustomers";

export default function CustomersPage() {
  return <CustomerFeature data={MOCK_CUSTOMERS} />;
}