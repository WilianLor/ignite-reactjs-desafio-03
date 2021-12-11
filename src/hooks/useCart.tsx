import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      const productResponse = await api.get(`/products/${productId}`);
      const productData = productResponse.data;

      const product = cart.find((product) => product.id === productId);

      if (productData) {
        if (product) {
          await updateProductAmount({ productId, amount: product.amount + 1 });
        } else {
          if (stock.amount < 1) {
            toast.error("Quantidade solicitada fora de estoque");
          } else {
            const response = await api.get(`/products/${productId}`);

            const product: Product = response.data;

            console.log(product);

            setCart([
              ...cart,
              {
                ...product,
                amount: 1,
              },
            ]);
          }
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.find((product) => product.id === productId)) {
        setCart(cart.filter((product) => product.id !== productId));
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`/stock/${productId}`);
      const stock: Stock = response.data;

      if (cart.find((product) => product.id === productId)) {
        if (amount > stock.amount || amount < 1) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          setCart(
            cart.map((product) => {
              if (product.id === productId) {
                return {
                  ...product,
                  amount: amount,
                };
              } else {
                return product;
              }
            })
          );
        }
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
