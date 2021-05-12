import { createContext, ReactNode, useContext, useState } from 'react';
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

	const addProduct = async (productId: number) => {
		try {
			const productAlreadyExists = cart.find(
				(product) => product.id === productId,
			);

			if (!productAlreadyExists) {
				const { data: product } = await api.get<Product>(
					`/products/${productId}`,
				);
				const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

				if (stock.amount < 1) {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}

				const newCart = [...cart, { ...product, amount: 1 }];

				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			} else {
				const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

				const newAmount = productAlreadyExists.amount + 1;

				if (newAmount > stock.amount) {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}

				const newCart = cart.map((product) => {
					if (product.id === productAlreadyExists.id)
						return { ...product, amount: newAmount };
					return product;
				});

				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			}
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const productExistsInCart = cart.find(
				(product) => product.id === productId,
			);

			if (!productExistsInCart) {
				toast.error('Erro na remoção do produto');
				return;
			}

			const newCart = cart.filter(
				(product) => product.id !== productExistsInCart.id,
			);

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
				toast.error('Erro na alteração de quantidade do produto');
				return;
			}

			const productAlreadyExist = cart.find(
				(product) => product.id === productId,
			);

			if (!productAlreadyExist) {
				toast.error('Erro na alteração de quantidade do produto');
				return;
			}

			const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
			const stockAmount = stock.amount;
			if (amount > stockAmount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			const newCart = cart.map((product) => {
				if (product.id === productAlreadyExist.id)
					return { ...product, amount };
				return product;
			});

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
