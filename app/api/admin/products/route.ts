import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import cloudinary from '@/utils/cloudinary';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({}).sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error en GET request:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const formData = await request.formData();
    const productData: any = {};
    const additionalImages: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === 'image' && value instanceof Blob) {
        productData.image = await uploadToCloudinary(value);
      } else if (key.startsWith('images[') && value instanceof Blob) {
        const index = parseInt(key.match(/\d+/)?.[0] || '0', 10);
        additionalImages[index] = await uploadToCloudinary(value);
      } else {
        productData[key] = value;
      }
    }

    productData.images = additionalImages.filter(Boolean);

    if (!productData.subcategory) {
      throw new Error('Subcategory is required');
    }

    const product = await Product.create(productData);
    return NextResponse.json({ message: 'Producto agregado exitosamente', product }, { status: 201 });
  } catch (error) {
    console.error('Error en POST request:', error);
    return NextResponse.json({ error: 'Error al añadir el producto' }, { status: 500 });
  }
}

async function uploadToCloudinary(file: Blob): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder: "products" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    ).end(buffer);
  });
}