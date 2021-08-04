import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);  
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  
  useEffect(()=>{
    prevCartRef.current = cart;
  })

  const prevCartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (prevCartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  },[ cart, prevCartPreviousValue ])


  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      
      const productExists = updateCart.find(product => productId === product.id ); 
      const stock = await api.get(`stock/${productId}`); //dados dos estoque

      const stockAmount = stock.data.amount; //quantidade no stock
      const currentAmount = productExists ? productExists.amount: 0; //se não tiver nada no estoque poem zero se tiver pegue a quantia
      const amount = currentAmount + 1; // some mais um na quantia do estoque
      if (amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      if(productExists){
        productExists.amount = amount; 
      }else{
        //perpetuando as implementações  
        const product = await api.get(`/products/${productId}`);
        const newProduct = { //sobrescrevendo o amount de product que veio de dentro da api na variavel product
          ...product.data,
          amount: 1
        }
        updateCart.push(newProduct);
      }
      setCart(updateCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
        const updatedCart =  [...cart];
        const productIndex = updatedCart.findIndex(product => product.id === productId) ; 
        
        if(productIndex >= 0){
          updatedCart.splice(productIndex, 1);
          setCart(updatedCart);
        }else{
          toast.error('Erro na remoção do produto');
        }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      } 
      const stock =  await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;

        if (amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          const updateCart = [...cart];
          const productExists = updateCart.find(product => productId === product.id);
          if (productExists){
            productExists.amount = amount;
            setCart(updateCart); 
          }else{
            throw Error();
          }
        }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
