import { AssetManagement } from '@/components/admin/AssetManagement';
import { listS3Assets, S3Asset } from '@/app/actions';

export default async function AssetsPage() {
  const initialAssets: S3Asset[] = await listS3Assets();
  
  return (
    <div className="container mx-auto px-4">
      <AssetManagement initialAssets={initialAssets} />
    </div>
  );
}
