import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/app/actions'

export const runtime = 'nodejs'
 
export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
 
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={post?.image} height="100" />
      </div>
    )
  )
}
