
import { getContactInquiries } from '@/app/actions';
import { InquiryManagement } from '@/components/admin/InquiryManagement';
import { ContactInquiry } from '@/types';

export default async function InquiriesPage() {
  const inquiries: ContactInquiry[] = await getContactInquiries();

  return (
    <div className="container mx-auto px-4">
      <InquiryManagement initialInquiries={inquiries} />
    </div>
  );
}
