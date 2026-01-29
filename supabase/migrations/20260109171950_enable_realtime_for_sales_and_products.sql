-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE sales;

-- Enable realtime for products table (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE products;;
