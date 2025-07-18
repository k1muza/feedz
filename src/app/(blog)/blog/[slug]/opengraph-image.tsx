import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/app/actions'

export const runtime = 'nodejs'
 
export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
 
  return new ImageResponse(
    (
      <img src={post?.image} alt="Post image" />
    )
  )
}
