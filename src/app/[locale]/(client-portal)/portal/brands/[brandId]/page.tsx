import { getPortalProofs } from "@/lib/actions/client-portal-data";
import BrandDetailClient from "./client";

export const dynamic = "force-dynamic";

export default async function BrandPage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = await params;
    const { data: proofs } = await getPortalProofs(brandId);

    return <BrandDetailClient brandId={brandId} proofs={proofs || []} />;
}
