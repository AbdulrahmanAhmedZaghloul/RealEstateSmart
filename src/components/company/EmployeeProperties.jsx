//Dependency imports
import { useEffect, useState } from "react";
import {
  Card,
  Center,
  Group,
  Image,
  Text,
  Select,
  Loader,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";

//Local imports
import classes from "../../styles/realEstates.module.css";
import axiosInstance from "../../api/config";
import Filter from "../../assets/dashboard/filter.svg";
import { useAuth } from "../../context/authContext";
import downArrow from "../../assets/downArrow.svg";
import FiltersModal from "../modals/filterPropertiesModal";
import { useTranslation } from "../../context/LanguageContext";

function EmployeeProperties({ id }) {
  const [listings, setListings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [
    filterModalOpened,
    { open: openFilterModal, close: closeFilterModal },
  ] = useDisclosure(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [filteredListings, setFilteredListings] = useState([]);

  const { colorScheme } = useMantineColorScheme();


  const { t } = useTranslation();

  const filterForm = useForm({
    initialValues: {
      location: "",
      category_id: "any",
      subcategory_id: "any",
      down_payment: "",
      price: "",
      area: "",
      rooms: "",
      bathrooms: "",
      level: "",
    },
  });

  const searchedListings = filteredListings
    .filter((listing) =>
      listing.title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (filter === "newest")
        return new Date(b.created_at) - new Date(a.created_at);
      if (filter === "oldest")
        return new Date(a.created_at) - new Date(b.created_at);
      return 0;
    });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/listings/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      console.log(res.data.data.listings);

      setListings(
        res.data.data.listings.filter(
          (listing) => listing.status === "approved"
        )
      );
    } catch (err) {
      console.log(err.response);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/api/employees", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setEmployees(res.data.data.employees);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        "/api/categories?with_subcategories=true",
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      const categoriesData = res.data.data.categories;
      setCategories(categoriesData);
      const subcategoriesData = categoriesData.flatMap(
        (category) => category.subcategories
      );
      setSubcategories(subcategoriesData);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterProperties = () => {
    const filters = filterForm.values;
    const filtered = listings.filter((listing) => {
      return (
        (filters.location === "" ||
          listing.location
            .toLowerCase()
            .includes(filters.location.toLowerCase())) &&
        (filters.category_id === "any" ||
          listing.category_id === parseInt(filters.category_id)) &&
        (filters.subcategory_id === "any" ||
          listing.subcategory_id === parseInt(filters.subcategory_id)) &&
        (filters.down_payment === "" ||
          listing.down_payment.toString().includes(filters.down_payment)) &&
        (filters.price === "" ||
          listing.price.toString().includes(filters.price)) &&
        (filters.area === "" ||
          listing.area.toString().includes(filters.area)) &&
        (filters.rooms === "" || listing.rooms === parseInt(filters.rooms)) &&
        (filters.bathrooms === "" ||
          listing.bathrooms === parseInt(filters.bathrooms)) &&
        (filters.level === "" || listing.floors === parseInt(filters.level))
      );
    });
    setFilteredListings(filtered);
    closeFilterModal();
  };

  useEffect(() => {
    fetchEmployees();
    fetchListings();
    fetchCategories();
  }, []);
  useEffect(() => {
    if (employees.length > 0 && listings.length > 0) {
      const employeeIds = new Set(
        employees.map((emp) => String(emp.employee_id))
      ); // تأكد من أن كل القيم نصوص

      const filteredByEmployee = listings.filter(
        (listing) =>
          listing.employee_id && Number(listing.employee_id) === Number(id)
      );

      setFilteredListings(filteredByEmployee);
    }
  }, [employees, listings, id]);
  if (!listings) {
    {
      loading && (
        <>
          <Center
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
            }}
          >
            <Loader size="xl" />
          </Center>
        </>
      );
    }
  }
  return (
    <>
      <Card
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
        className={classes.mainContainer}
        radius="lg"
      >
        <span
          mt={"24px"}
          style={{
            fontSize: "24px",
            fontWeight: "500",
            color: "var(--color-3)",
          }}
        >
          {t.Properties} : {listings.length}
          {console.log(filteredListings)}

        </span>
        <div className={classes.controls}>
          <input
            style={{
              backgroundColor: "",
              border: "1px solid #B8C0CC",
            }}
            className={classes.search}
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            variant="default"
            radius="md"
            onClick={openFilterModal}
            className={classes.filter}
          >
            <img src={Filter} />
          </button>
          <div className={classes.addAndSort}>
            <Select
              placeholder="Sort by"
              value={filter}
              onChange={setFilter}
              rightSection={<img src={downArrow} alt="arrow" />}
              data={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ]}
              styles={{
                // Match your original styles
                input: {
                  width: "132px",
                  height: "48px",
                  backgroundColor: "white",
                  borderRadius: "15px",
                  border: "1.5px solid var(--color-border)",
                  padding: "14px 24px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  backgroundColor: "",
                  color: "var(--color-4)",
                },

                dropdown: {
                  borderRadius: "15px", // Curved dropdown menu
                },
                wrapper: {
                  width: "132px",
                },
                item: {
                  color: "var(--color-4)", // Dropdown option text color
                  "&[data-selected]": {
                    color: "white", // Selected option text color
                  },
                },
              }}
            />
          </div>
        </div>
        {listings.length === 0 && !loading ? (
          <Center>
            <Text>No listings found.</Text>
          </Center>
        ) : (
          <Group align="center" spacing="xl">
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className={classes.card}
                onClick={() => {
                  navigate(`/dashboard/Properties/${listing.id}`);
                }}
                style={{
                  cursor: "pointer",
                  border: "1px solid #B8C0CC",
                  backgroundColor: "var(--color-5)",
                }}
              >
                <Card.Section radius="md">
                  <Image
                    src={listing.primary_image?.image_url}
                    alt={listing.title}
                    h="233px"
                    radius="md"
                  />
                </Card.Section>
                <div style={{ marginTop: "16px", display: "flex" }}>
                  <span
                    style={{
                      color: "var(--color-1)",
                    }}
                    className={classes.listingPrice}
                  >
                    <span className="icon-saudi_riyal">&#xea; </span>{" "}
                    {Math.floor(listing.price).toLocaleString()}
                  </span>
                  <div
                    style={{
                      border: "1px solid #E3E3E3",
                      color: "var(--color-4)",
                    }}
                    className={classes.downPaymentBadge}
                  >
                    {Math.floor((listing.down_payment / listing.price) * 100)}%
                    {t.Downpayment}
                  </div>
                </div>
                <div style={{ display: "block" }}>
                  <div
                    style={{
                    }}
                    className={classes.listingTitle}
                  >
                    {listing.title}
                  </div>
                  <div
                    style={{
                    }}
                    className={classes.listingUtilities}
                  >
                    <div
                      style={{
                      }}
                      className={classes.listingUtility}
                    >
                      <div

                        className={classes.utilityImage}
                      >
                        <svg
                          width="20"
                          height="13"
                          viewBox="0 0 20 13"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 0C1.24493 3.23106e-05 1.48134 0.089956 1.66437 0.252715C1.84741 0.415474 1.96434 0.639749 1.993 0.883L2 1L2 7H8V2C8.00003 1.75507 8.08996 1.51866 8.25272 1.33563C8.41547 1.15259 8.63975 1.03566 8.883 1.007L9 1L17 1C17.7652 0.999957 18.5015 1.29233 19.0583 1.81728C19.615 2.34224 19.9501 3.06011 19.995 3.824L20 4V12C19.9997 12.2549 19.9021 12.5 19.7272 12.6854C19.5522 12.8707 19.313 12.9822 19.0586 12.9972C18.8042 13.0121 18.5536 12.9293 18.3582 12.7657C18.1627 12.6021 18.0371 12.3701 18.007 12.117L18 12V9H2V12C1.99972 12.2549 1.90212 12.5 1.72715 12.6854C1.55218 12.8707 1.31305 12.9822 1.05861 12.9972C0.804163 13.0121 0.553621 12.9293 0.358167 12.7657C0.162714 12.6021 0.0371036 12.3701 0.00699997 12.117L0 12L0 1C0 0.734784 0.105357 0.48043 0.292893 0.292893C0.48043 0.105357 0.734784 0 1 0Z"
                            fill="#B8C0CC"
                          />
                          <path
                            d="M5 2C5.38914 2.00012 5.7698 2.11377 6.09532 2.32701C6.42084 2.54025 6.67707 2.84383 6.83263 3.20053C6.98818 3.55723 7.0363 3.95156 6.97108 4.3352C6.90586 4.71884 6.73013 5.07512 6.46544 5.36038C6.20075 5.64564 5.85859 5.84748 5.48089 5.94117C5.10319 6.03486 4.70637 6.01633 4.33904 5.88785C3.97172 5.75937 3.64986 5.52652 3.4129 5.21784C3.17594 4.90915 3.03419 4.53805 3.005 4.15L3 4L3.005 3.85C3.04284 3.34685 3.26947 2.87659 3.63945 2.5335C4.00943 2.19041 4.49542 1.99984 5 2Z"
                            fill="#B8C0CC"
                          />
                        </svg>
                      </div>
                      {listing.rooms}
                    </div>
                    <div
                      style={{
                      }}
                      className={classes.listingUtility}
                    >
                      <div

                        className={classes.utilityImage}
                      >
                        <svg
                          wwidth="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M19 12V13C19 14.91 17.93 16.57 16.35 17.41L17 20H15L14.5 18H5.5L5 20H3L3.65 17.41C2.8494 16.9849 2.1797 16.3498 1.71282 15.5729C1.24594 14.7959 0.999514 13.9064 1 13V12H0L0 10H18V3C18 2.73478 17.8946 2.48043 17.7071 2.29289C17.5196 2.10536 17.2652 2 17 2C16.5 2 16.12 2.34 16 2.79C16.63 3.33 17 4.13 17 5H11C11 4.20435 11.3161 3.44129 11.8787 2.87868C12.4413 2.31607 13.2044 2 14 2H14.17C14.58 0.84 15.69 0 17 0C17.7956 0 18.5587 0.316071 19.1213 0.87868C19.6839 1.44129 20 2.20435 20 3V12L19 12ZM17 12H3V13C3 13.7956 3.31607 14.5587 3.87868 15.1213C4.44129 15.6839 5.20435 16 6 16H14C14.7956 16 15.5587 15.6839 16.1213 15.1213C16.6839 14.5587 17 13.7956 17 13V12Z"
                            fill="#B8C0CC"
                          />
                        </svg>
                      </div>
                      {listing.bathrooms}
                    </div>
                    <div
                      style={{
                      }}
                      className={classes.listingUtility}
                    >
                      <div

                        className={classes.utilityImage}
                      >
                        {/* <img src={area}></img> */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 3.5V20.5M3 9.4C3 7.16 3 6.04 3.436 5.184C3.81949 4.43139 4.43139 3.81949 5.184 3.436C6.04 3 7.16 3 9.4 3H14.6C16.84 3 17.96 3 18.816 3.436C19.5686 3.81949 20.1805 4.43139 20.564 5.184C21 6.04 21 7.16 21 9.4V14.6C21 16.84 21 17.96 20.564 18.816C20.1805 19.5686 19.5686 20.1805 18.816 20.564C17.96 21 16.84 21 14.6 21H9.4C7.16 21 6.04 21 5.184 20.564C4.43139 20.1805 3.81949 19.5686 3.436 18.816C3 17.96 3 16.84 3 14.6V9.4Z"
                            stroke="#B8C0CC"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <line
                            x1="3"
                            y1="12.35"
                            x2="21"
                            y2="12.35"
                            stroke="#B8C0CC"
                            stroke-width="1.3"
                          />
                        </svg>
                      </div>
                      {listing.area} sqm
                    </div>
                  </div>
                  <div
                    style={{
                    }}
                    className={classes.listingEmployee}
                  >
                    {t.Employee}: {listing.employee?.name}
                  </div>
                  <div
                    style={{
                    }}
                    className={classes.listingLocation}
                  >
                    {listing.location}
                  </div>
                  <div
                    style={{
                    }}
                    className={classes.listingDate}
                  >
                    {Math.floor(
                      (new Date() - new Date(listing.created_at)) /
                      (1000 * 60 * 60 * 24)
                    ) > 1
                      ? `${Math.floor(
                        (new Date() - new Date(listing.created_at)) /
                        (1000 * 60 * 60 * 24)
                      )} days ago`
                      : Math.floor(
                        (new Date() - new Date(listing.created_at)) /
                        (1000 * 60 * 60 * 24)
                      ) === 1
                        ? "Yesterday"
                        : "Today"}
                  </div>
                </div>
              </Card>
            ))}
          </Group>
        )}
      </Card>

      <FiltersModal
        opened={filterModalOpened}
        onClose={closeFilterModal}
        categories={categories}
        subcategories={subcategories}
        onFilter={handleFilterProperties}
        onReset={() => {
          setFilteredListings(listings);
          closeFilterModal();
        }}
      />
    </>
  );
}

export default EmployeeProperties;
